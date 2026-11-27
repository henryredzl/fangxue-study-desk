import CommonCrypto
import CoreFoundation
import Foundation
import Security
import SQLite3

struct StudyProblem: Error {
    let status: Int
    let message: String

    init(_ status: Int, _ message: String) {
        self.status = status
        self.message = message
    }
}

private final class StudySQLite {
    private let db: OpaquePointer
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    init(url: URL) throws {
        var handle: OpaquePointer?
        let status = sqlite3_open_v2(url.path, &handle, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE, nil)
        guard status == SQLITE_OK, let existing = handle else {
            if let handle = handle { sqlite3_close(handle) }
            throw StudyProblem(500, "无法打开学习记录数据库。")
        }
        db = existing
        sqlite3_busy_timeout(db, 5_000)
    }

    deinit { sqlite3_close(db) }

    func script(_ sql: String) throws {
        guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else {
            throw StudyProblem(500, "数据库操作未完成，请重试。")
        }
    }

    func rows(_ sql: String, _ args: [String] = []) throws -> [[String]] {
        var prepared: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &prepared, nil) == SQLITE_OK, let statement = prepared else {
            throw StudyProblem(500, "无法读取学习记录。")
        }
        defer { sqlite3_finalize(statement) }
        for (offset, value) in args.enumerated() {
            guard sqlite3_bind_text(statement, Int32(offset + 1), value, -1, transient) == SQLITE_OK else {
                throw StudyProblem(500, "数据库参数无效。")
            }
        }
        var result: [[String]] = []
        var status = sqlite3_step(statement)
        while status == SQLITE_ROW {
            result.append((0..<sqlite3_column_count(statement)).map { column in
                sqlite3_column_text(statement, column).map { String(cString: $0) } ?? ""
            })
            status = sqlite3_step(statement)
        }
        guard status == SQLITE_DONE else { throw StudyProblem(500, "数据库操作未完成，请重试。") }
        return result
    }

    @discardableResult
    func insert(_ sql: String, _ args: [String]) throws -> Bool {
        _ = try rows(sql, args)
        return sqlite3_changes(db) > 0
    }
}

final class StudyStore {
    typealias JSON = [String: Any]
    static let maxImportBytes = 12 * 1024 * 1024
    private let db: StudySQLite
    private let questions: [String: JSON]
    private let dateFormat = ISO8601DateFormatter()
    private let wholeSeconds = ISO8601DateFormatter()
    private var authTimes: [TimeInterval] = []

    init(databaseURL: URL, bankURL: URL) throws {
        let bank = try JSONSerialization.jsonObject(with: Data(contentsOf: bankURL))
        guard let questions = bank as? [String: JSON], !questions.isEmpty else {
            throw StudyProblem(500, "无法载入题库，请重新安装应用。")
        }
        self.questions = questions
        db = try StudySQLite(url: databaseURL)
        dateFormat.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        try db.script("""
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA secure_delete = ON;
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS login_session (
                singleton INTEGER PRIMARY KEY CHECK(singleton = 1), account_id INTEGER NOT NULL REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id),
                request_id TEXT NOT NULL, question_id TEXT NOT NULL,
                result TEXT NOT NULL CHECK(result IN ('correct', 'wrong', 'written')),
                answered_at TEXT NOT NULL, UNIQUE(account_id, request_id)
            );
            CREATE INDEX IF NOT EXISTS attempts_by_account ON attempts(account_id, answered_at, id);
            """)
    }

    func signedInID() throws -> Int? {
        try db.rows("SELECT account_id FROM login_session WHERE singleton = 1").first.flatMap { Int($0[0]) }
    }

    func deleteAccount(id: Int) throws -> JSON {
        guard try signedInID() == id else { throw StudyProblem(401, "请登录要删除的账号后重试。") }
        let args = [String(id)]
        try db.script("BEGIN IMMEDIATE;")
        do {
            try db.insert("DELETE FROM attempts WHERE account_id = ?", args)
            try db.insert("DELETE FROM login_session WHERE account_id = ?", args)
            try db.insert("DELETE FROM accounts WHERE id = ?", args)
            try db.script("COMMIT;")
        } catch {
            try? db.script("ROLLBACK;")
            throw error
        }
        try? db.script("PRAGMA wal_checkpoint(TRUNCATE);")
        return ["user": NSNull()]
    }

    func request(_ path: String, body: JSON) throws -> JSON {
        switch path {
        case "state": return try state()
        case "register": return try signIn(body, register: true)
        case "login": return try signIn(body, register: false)
        case "logout":
            try db.script("DELETE FROM login_session;")
            return ["user": NSNull()]
        case "attempts": return try save(body)
        default: throw StudyProblem(404, "找不到这个功能。")
        }
    }

    private func state() throws -> JSON {
        guard let id = try signedInID(),
              let user = try db.rows("SELECT username FROM accounts WHERE id = ?", [String(id)]).first else {
            return ["user": NSNull()]
        }
        let attempts = try db.rows("""
            SELECT question_id, result, answered_at FROM attempts
            WHERE account_id = ? ORDER BY answered_at, id
            """, [String(id)])
        var records: [String: JSON] = [:]
        for row in attempts where questions[row[0]] != nil {
            let question = row[0], result = row[1]
            let first: Any = result == "written" ? NSNull() as Any : (result == "correct") as Any
            var record = records[question] ?? ["first": first, "correct": 0, "wrong": 0, "written": 0]
            record[result] = (record[result] as? Int ?? 0) + 1
            record["latest"] = result
            record["review"] = result == "wrong"
            record["at"] = row[2]
            records[question] = record
        }
        return ["user": ["id": id, "username": user[0]], "records": records]
    }

    private func signIn(_ body: JSON, register: Bool) throws -> JSON {
        let now = ProcessInfo.processInfo.systemUptime
        authTimes.removeAll { now - $0 > 60 }
        guard authTimes.count < 20 else { throw StudyProblem(429, "尝试次数较多，请一分钟后再试。") }
        authTimes.append(now)
        let rawName = body["username"] as? String ?? ""
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
            .precomposedStringWithCompatibilityMapping.lowercased()
        guard name.range(of: "\\A[\\p{Han}a-z0-9_-]{3,24}\\z", options: .regularExpression) != nil,
              let password = body["password"] as? String, (8...128).contains(password.utf16.count) else {
            throw StudyProblem(400, "账号名需为 3–24 个汉字、字母、数字、下划线或短横线，密码需为 8–128 个字符。")
        }
        let id: String
        if register {
            var salt = Data(count: 16)
            let status = salt.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
                SecRandomCopyBytes(kSecRandomDefault, bytes.count, bytes.baseAddress!)
            }
            guard status == errSecSuccess else { throw StudyProblem(500, "暂时无法创建学习账号。") }
            let hash = try Self.hash(password, salt)
            guard try db.insert("INSERT INTO accounts(username, salt, hash) VALUES(?, ?, ?) ON CONFLICT(username) DO NOTHING",
                                [name, salt.base64EncodedString(), hash.base64EncodedString()]),
                  let created = try db.rows("SELECT id FROM accounts WHERE username = ?", [name]).first else {
                throw StudyProblem(409, "这个账号名已经使用，请登录或换一个。")
            }
            id = created[0]
        } else {
            let existing = try db.rows("SELECT id, salt, hash FROM accounts WHERE username = ?", [name]).first
            let salt = existing.flatMap { Data(base64Encoded: $0[1]) } ?? Data(repeating: 0, count: 16)
            let actual = try Self.hash(password, salt)
            guard let existing = existing, let expected = Data(base64Encoded: existing[2]),
                  actual.count == expected.count,
                  zip(actual, expected).reduce(UInt8(0), { $0 | ($1.0 ^ $1.1) }) == 0 else {
                throw StudyProblem(401, "账号名或密码不正确。")
            }
            id = existing[0]
        }
        try db.insert("INSERT INTO login_session VALUES(1, ?) ON CONFLICT(singleton) DO UPDATE SET account_id = excluded.account_id", [id])
        return try state()
    }

    private static func hash(_ password: String, _ salt: Data) throws -> Data {
        let secret = Array(password.utf8)
        var key = Data(count: 32)
        let status = key.withUnsafeMutableBytes { (output: UnsafeMutableRawBufferPointer) in
            salt.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
                secret.withUnsafeBytes { (passwordBytes: UnsafeRawBufferPointer) in
                    CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2),
                                        passwordBytes.baseAddress!.assumingMemoryBound(to: CChar.self), secret.count,
                                        bytes.baseAddress!.assumingMemoryBound(to: UInt8.self), bytes.count,
                                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 210_000,
                                        output.baseAddress!.assumingMemoryBound(to: UInt8.self), output.count)
                }
            }
        }
        guard status == kCCSuccess else { throw StudyProblem(500, "暂时无法验证密码。") }
        return key
    }

    private func save(_ body: JSON) throws -> JSON {
        guard let id = try signedInID() else { throw StudyProblem(401, "请重新登录后提交。") }
        guard Self.integer(body["accountId"]) == id else { throw StudyProblem(409, "账号已切换，请重新登录后提交。") }
        guard let requestID = body["attemptId"] as? String, Self.validID(requestID),
              let questionID = body["questionId"] as? String, let question = questions[questionID] else {
            throw StudyProblem(400, "题目或作答编号不正确。")
        }
        let result = try Self.grade(question, answer: body["answer"])
        try insertAttempt(id, requestID, questionID, result, dateFormat.string(from: Date()))
        let saved = try db.rows(
            "SELECT question_id, result FROM attempts WHERE account_id = ? AND request_id = ?", [String(id), requestID]
        ).first
        guard saved == [questionID, result] else { throw StudyProblem(409, "这条作答编号已使用，请重新开始本题。") }
        var response = try state()
        response["result"] = result
        return response
    }

    @discardableResult
    private func insertAttempt(_ id: Int, _ request: String, _ question: String, _ result: String, _ date: String) throws -> Bool {
        try db.insert("""
            INSERT INTO attempts(account_id, request_id, question_id, result, answered_at)
            VALUES(?, ?, ?, ?, ?) ON CONFLICT(account_id, request_id) DO NOTHING
            """, [String(id), request, question, result, date])
    }

    func importRecords(destination: Int, data: Data) throws -> JSON {
        guard let id = try signedInID(), id == destination else {
            throw StudyProblem(401, "请登录要接收记录的账号后重试。")
        }
        guard data.count <= Self.maxImportBytes,
              let file = (try? JSONSerialization.jsonObject(with: data)) as? JSON,
              file["format"] as? String == "fangxue-study-records-v1",
              let attempts = file["attempts"] as? [JSON], attempts.count <= 50_000 else {
            throw StudyProblem(400, "请选择电脑端下载的学习记录文件。")
        }
        let account = try db.rows("SELECT username FROM accounts WHERE id = ?", [String(id)]).first
        guard account?.first == file["username"] as? String, file["username"] is String else {
            throw StudyProblem(400, "文件里的账号名与当前设备账号不同。请登录同名账号再导入。")
        }
        var inserted = 0
        try db.script("BEGIN IMMEDIATE;")
        do {
            for attempt in attempts {
                guard let request = attempt["attemptId"] as? String, Self.validID(request),
                      let question = attempt["questionId"] as? String, let kind = questions[question]?["type"] as? String,
                      let result = attempt["result"] as? String,
                      kind == "write" ? result == "written" : ["correct", "wrong"].contains(result),
                      let timestamp = attempt["answeredAt"] as? String,
                      let date = dateFormat.date(from: timestamp) ?? wholeSeconds.date(from: timestamp) else {
                    throw StudyProblem(400, "迁移文件包含无法识别的作答记录。")
                }
                if try insertAttempt(id, request, question, result, dateFormat.string(from: date)) { inserted += 1 }
            }
            try db.script("COMMIT;")
        } catch {
            try? db.script("ROLLBACK;")
            throw error
        }
        var response = try state()
        response["imported"] = inserted
        response["skipped"] = attempts.count - inserted
        return response
    }

    private static func validID(_ value: String) -> Bool {
        value.range(of: "\\A[a-f0-9-]{36}\\z", options: .regularExpression) != nil
    }

    private static func integer(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else { return nil }
        return Int(exactly: number.doubleValue)
    }

    static func grade(_ question: JSON, answer: Any?) throws -> String {
        let type = question["type"] as? String
        if type == "fill" || type == "write" {
            guard let text = answer as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  text.utf16.count <= (type == "write" ? 600 : 80) else {
                throw StudyProblem(400, "请填写有效答案。")
            }
            if type == "write" { return "written" }
            let exact = question["caseSensitive"] as? Bool == true
            let expected = question["answer"] as? [String] ?? []
            return expected.contains { normalize($0, exact) == normalize(text, exact) } ? "correct" : "wrong"
        }
        let count = (question["choices"] as? [String])?.count ?? 0
        func index(_ value: Any?) throws -> Int {
            guard let index = integer(value), (0..<count).contains(index) else { throw StudyProblem(400, "请选择有效选项。") }
            return index
        }
        if type == "pick" { return try index(answer) == integer(question["answer"]) ? "correct" : "wrong" }
        guard let values = answer as? [Any], (1...max(1, count)).contains(values.count),
              type != "order" || values.count == count else { throw StudyProblem(400, "请检查所选选项。") }
        let selected = try values.map { try index($0) }
        guard Set(selected).count == selected.count else { throw StudyProblem(400, "请检查重复选项。") }
        let expected = question["answer"] as? [Int] ?? []
        let correct = type == "order" ? expected == selected : Set(expected) == Set(selected)
        return correct ? "correct" : "wrong"
    }

    private static func normalize(_ text: String, _ exact: Bool) -> String {
        let clean = text.precomposedStringWithCompatibilityMapping
            .replacingOccurrences(of: "[\\x{0009}-\\x{000D}\\p{Z}\\x{FEFF}]+", with: "", options: .regularExpression)
            .replacingOccurrences(of: "[。.!！]\\z", with: "", options: .regularExpression)
        return exact ? clean : clean.lowercased()
    }
}
