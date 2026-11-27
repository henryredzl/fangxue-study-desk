import Foundation

@main
struct StudyStoreSmoke {
    static func main() throws {
        let bankURL = URL(fileURLWithPath: CommandLine.arguments[1])
        let bank = try JSONSerialization.jsonObject(with: Data(contentsOf: bankURL)) as! [String: StudyStore.JSON]
        for (id, question) in bank {
            let type = question["type"] as! String
            let value = type == "fill" ? (question["answer"] as! [String])[0] as Any : question["answer"]!
            let graded = try StudyStore.grade(question, answer: value)
            precondition(graded == (type == "write" ? "written" : "correct"), id)
        }

        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let database = folder.appendingPathComponent("test.sqlite")
        let credentials = ["username": "小书桌", "password": "Test-only-passphrase"]
        var store = try StudyStore(databaseURL: database, bankURL: bankURL)
        let created = try store.request("register", body: credentials)
        let user = created["user"] as! StudyStore.JSON
        let id = user["id"] as! Int
        let question = bank.first { $0.key.contains("-city-") && $0.value["type"] as? String == "fill" }!
        let request = UUID().uuidString.lowercased()
        var body: StudyStore.JSON = ["accountId": id, "attemptId": request, "questionId": question.key, "answer": "incorrect"]
        let wrong = try store.request("attempts", body: body)
        precondition(wrong["result"] as? String == "wrong")
        _ = try store.request("attempts", body: body)
        body["attemptId"] = UUID().uuidString.lowercased()
        body["answer"] = (question.value["answer"] as! [String])[0]
        let correct = try store.request("attempts", body: body)
        precondition(correct["result"] as? String == "correct")

        store = try StudyStore(databaseURL: database, bankURL: bankURL)
        let restored = try store.request("state", body: [:])
        let record = (restored["records"] as! [String: StudyStore.JSON])[question.key]!
        precondition(record["first"] as? Bool == false && record["review"] as? Bool == false)
        precondition(record["wrong"] as? Int == 1 && record["correct"] as? Int == 1)
        _ = try store.request("logout", body: [:])
        let second = try store.request("register", body: ["username": "another-account", "password": "Test-only-passphrase"])
        precondition((second["records"] as! [String: StudyStore.JSON]).isEmpty)
        _ = try store.request("login", body: credentials)
        let transfer: StudyStore.JSON = ["format": "fangxue-study-records-v1", "username": "小书桌", "attempts": [
            ["attemptId": UUID().uuidString.lowercased(), "questionId": question.key,
             "result": "correct", "answeredAt": "2026-11-25T12:30:00.000Z"]
        ]]
        let bytes = try JSONSerialization.data(withJSONObject: transfer)
        let imported = try store.importRecords(destination: id, data: bytes)
        precondition(imported["imported"] as? Int == 1)
        let duplicate = try store.importRecords(destination: id, data: bytes)
        precondition(duplicate["skipped"] as? Int == 1)
        let deleted = try store.deleteAccount(id: id)
        precondition(deleted["user"] is NSNull)
        do {
            _ = try store.request("login", body: credentials)
            preconditionFailure("Deleted accounts must not sign in")
        } catch let error as StudyProblem {
            precondition(error.status == 401)
        }
        _ = try store.request("login", body: ["username": "another-account", "password": "Test-only-passphrase"])
        let recreated = try store.request("register", body: credentials)
        precondition((recreated["records"] as! [String: StudyStore.JSON]).isEmpty)
        print("Verified \(bank.count) answer keys, SQLite persistence, isolation, migration, and account deletion.")
    }
}
