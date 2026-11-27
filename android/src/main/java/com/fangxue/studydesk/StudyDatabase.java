package com.fangxue.studydesk;

import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.SystemClock;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Instant;
import java.time.format.DateTimeFormatterBuilder;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

final class StudyDatabase extends SQLiteOpenHelper {
    private static final String SESSION = "student_id";
    private static final String TRANSFER_FORMAT = "fangxue-study-records-v1";
    private static final java.time.format.DateTimeFormatter DATE_FORMAT = new DateTimeFormatterBuilder().appendInstant(3).toFormatter();
    private final SharedPreferences session;
    private final Map<String, JSONObject> questions = new HashMap<>();
    private final ArrayDeque<Long> authAttempts = new ArrayDeque<>();

    StudyDatabase(Context context, JSONObject bank) throws JSONException {
        super(context, "study.sqlite", null, 1);
        session = context.getSharedPreferences("study_session", Context.MODE_PRIVATE);
        for (Iterator<String> ids = bank.keys(); ids.hasNext();) {
            String id = ids.next();
            questions.put(id, bank.getJSONObject(id));
        }
    }

    @Override public void onConfigure(SQLiteDatabase db) { db.setForeignKeyConstraintsEnabled(true); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE accounts (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL)");
        db.execSQL("CREATE TABLE attempts (id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, " +
            "request_id TEXT NOT NULL, question_id TEXT NOT NULL, result TEXT NOT NULL CHECK(result IN ('correct','wrong','written')), " +
            "answered_at TEXT NOT NULL, UNIQUE(account_id, request_id))");
        db.execSQL("CREATE INDEX chronological_attempts ON attempts(account_id, answered_at, id)");
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        throw new IllegalStateException("Unsupported database version: " + oldVersion);
    }

    static final class Problem extends Exception {
        final int status;
        Problem(int status, String message) { super(message); this.status = status; }
    }

    synchronized JSONObject request(String endpoint, JSONObject input) throws Exception {
        switch (endpoint) {
            case "state": return state();
            case "login": return signIn(input, false);
            case "register": return signIn(input, true);
            case "logout":
                if (!session.edit().remove(SESSION).commit()) throw new Problem(500, "退出登录未完成，请重试。");
                return state();
            case "attempts": return saveAttempt(input);
            default: throw new Problem(404, "找不到这个功能。");
        }
    }

    synchronized long signedInId() { return session.getLong(SESSION, -1); }

    private JSONObject user(long id) throws JSONException {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT username FROM accounts WHERE id = ?", new String[]{Long.toString(id)})) {
            if (!cursor.moveToFirst()) return null;
            return new JSONObject().put("id", id).put("username", cursor.getString(0));
        }
    }

    private JSONObject state() throws JSONException {
        long id = signedInId();
        JSONObject user = user(id);
        if (user == null) return new JSONObject().put("user", JSONObject.NULL);
        JSONObject records = new JSONObject();
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT question_id, result, answered_at FROM attempts WHERE account_id = ? ORDER BY answered_at, id",
            new String[]{Long.toString(id)})) {
            while (cursor.moveToNext()) {
                String question = cursor.getString(0);
                if (!questions.containsKey(question)) continue;
                String result = cursor.getString(1);
                JSONObject summary = records.optJSONObject(question);
                if (summary == null) {
                    summary = new JSONObject().put("first", result.equals("written") ? JSONObject.NULL : result.equals("correct"));
                    records.put(question, summary);
                }
                summary.put(result, summary.optInt(result) + 1)
                    .put("latest", result).put("review", result.equals("wrong")).put("at", cursor.getString(2));
            }
        }
        for (Iterator<String> keys = records.keys(); keys.hasNext();) {
            JSONObject item = records.getJSONObject(keys.next());
            for (String result : new String[]{"correct", "wrong", "written"}) if (!item.has(result)) item.put(result, 0);
        }
        return new JSONObject().put("user", user).put("records", records);
    }

    private JSONObject signIn(JSONObject input, boolean register) throws Exception {
        long now = SystemClock.elapsedRealtime();
        while (!authAttempts.isEmpty() && now - authAttempts.peekFirst() > 60_000) authAttempts.removeFirst();
        if (authAttempts.size() >= 20) throw new Problem(429, "尝试次数较多，请一分钟后再试。");
        authAttempts.addLast(now);
        String name = Normalizer.normalize(input.optString("username").trim(), Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
        String password = input.optString("password");
        if (!name.matches("[\\p{IsHan}a-z0-9_-]{3,24}") || password.length() < 8 || password.length() > 128) {
            throw new Problem(400, "账号名需为 3–24 个汉字、字母、数字、下划线或短横线，密码需为 8–128 个字符。");
        }
        SQLiteDatabase db = getWritableDatabase();
        long id;
        if (register) {
            byte[] salt = new byte[16];
            new SecureRandom().nextBytes(salt);
            ContentValues values = new ContentValues();
            values.put("username", name);
            values.put("salt", Base64.encodeToString(salt, Base64.NO_WRAP));
            values.put("hash", Base64.encodeToString(hash(password, salt), Base64.NO_WRAP));
            id = db.insertWithOnConflict("accounts", null, values, SQLiteDatabase.CONFLICT_IGNORE);
            if (id == -1) throw new Problem(409, "这个账号名已经使用，请登录或换一个。");
        } else {
            try (Cursor cursor = db.rawQuery("SELECT id, salt, hash FROM accounts WHERE username = ?", new String[]{name})) {
                boolean found = cursor.moveToFirst();
                byte[] salt = found ? Base64.decode(cursor.getString(1), Base64.NO_WRAP) : new byte[16];
                byte[] actual = hash(password, salt);
                if (!found || !MessageDigest.isEqual(actual, Base64.decode(cursor.getString(2), Base64.NO_WRAP))) {
                    throw new Problem(401, "账号名或密码不正确。");
                }
                id = cursor.getLong(0);
            }
        }
        if (!session.edit().putLong(SESSION, id).commit()) throw new Problem(500, "登录未能保存，请重试。");
        return state();
    }

    private byte[] hash(String password, byte[] salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 210_000, 256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        finally { spec.clearPassword(); }
    }

    private JSONObject saveAttempt(JSONObject data) throws Exception {
        long accountId = signedInId();
        if (accountId == -1) throw new Problem(401, "请重新登录后提交。");
        if (data.optLong("accountId", -1) != accountId) throw new Problem(409, "账号已切换，请重新登录后提交。");
        String requestId = data.optString("attemptId");
        String questionId = data.optString("questionId");
        JSONObject question = questions.get(questionId);
        if (question == null || !requestId.matches("[a-f0-9-]{36}")) throw new Problem(400, "题目或作答编号不正确。");
        String result = grade(question, data.opt("answer"));
        SQLiteDatabase db = getWritableDatabase();
        insertAttempt(db, accountId, requestId, questionId, result, DATE_FORMAT.format(Instant.now()));
        try (Cursor cursor = db.rawQuery("SELECT question_id, result FROM attempts WHERE account_id = ? AND request_id = ?",
                new String[]{Long.toString(accountId), requestId})) {
            if (!cursor.moveToFirst() || !questionId.equals(cursor.getString(0)) || !result.equals(cursor.getString(1))) {
                throw new Problem(409, "这条作答编号已使用，请重新开始本题。");
            }
        }
        return state().put("result", result);
    }

    private long insertAttempt(SQLiteDatabase db, long accountId, String requestId, String questionId, String result, String date) {
        ContentValues values = new ContentValues();
        values.put("account_id", accountId);
        values.put("request_id", requestId);
        values.put("question_id", questionId);
        values.put("result", result);
        values.put("answered_at", date);
        return db.insertWithOnConflict("attempts", null, values, SQLiteDatabase.CONFLICT_IGNORE);
    }

    synchronized JSONObject importRecords(long destination, JSONObject transfer) throws Exception {
        JSONObject user = user(destination);
        if (destination != signedInId() || user == null) throw new Problem(401, "请登录要接收记录的账号后重试。");
        JSONArray attempts = transfer.optJSONArray("attempts");
        if (!TRANSFER_FORMAT.equals(transfer.optString("format")) || attempts == null || attempts.length() > 50_000) {
            throw new Problem(400, "请选择电脑端下载的学习记录文件。");
        }
        if (!user.getString("username").equals(transfer.optString("username"))) throw new Problem(400, "文件里的账号名与当前手机账号不同。请登录同名账号再导入。");
        SQLiteDatabase db = getWritableDatabase();
        int inserted = 0;
        db.beginTransaction();
        try {
            for (int i = 0; i < attempts.length(); i++) {
                JSONObject attempt = attempts.getJSONObject(i);
                String requestId = attempt.getString("attemptId");
                String questionId = attempt.getString("questionId");
                String result = attempt.getString("result");
                JSONObject question = questions.get(questionId);
                boolean validResult = question != null && ("write".equals(question.getString("type")) ? result.equals("written") : result.equals("correct") || result.equals("wrong"));
                if (!requestId.matches("[a-f0-9-]{36}") || !validResult) throw new Problem(400, "迁移文件包含无法识别的作答记录。");
                String date = DATE_FORMAT.format(Instant.parse(attempt.getString("answeredAt")));
                if (insertAttempt(db, destination, requestId, questionId, result, date) != -1) inserted++;
            }
            db.setTransactionSuccessful();
        } catch (JSONException | java.time.DateTimeException error) {
            throw new Problem(400, "迁移文件中的记录格式不正确。");
        } finally { db.endTransaction(); }
        return state().put("imported", inserted).put("skipped", attempts.length() - inserted);
    }

    static String grade(JSONObject question, Object answer) throws Exception {
        String type = question.getString("type");
        if (type.equals("fill") || type.equals("write")) {
            if (!(answer instanceof String) || ((String) answer).trim().isEmpty() || ((String) answer).length() > (type.equals("write") ? 600 : 80)) {
                throw new Problem(400, "请填写有效答案。");
            }
            if (type.equals("write")) return "written";
            JSONArray acceptable = question.getJSONArray("answer");
            String normalized = normalize((String) answer, question.optBoolean("caseSensitive"));
            for (int i = 0; i < acceptable.length(); i++) {
                if (normalized.equals(normalize(acceptable.getString(i), question.optBoolean("caseSensitive")))) return "correct";
            }
            return "wrong";
        }
        int options = question.getJSONArray("choices").length();
        if (type.equals("pick")) return option(answer, options) == question.getInt("answer") ? "correct" : "wrong";
        if (!(answer instanceof JSONArray)) throw new Problem(400, "请检查所选选项。");
        JSONArray selected = (JSONArray) answer;
        if (selected.length() == 0 || selected.length() > options || (type.equals("order") && selected.length() != options)) {
            throw new Problem(400, "请检查所选选项。");
        }
        HashSet<Integer> indexes = new HashSet<>();
        for (int i = 0; i < selected.length(); i++) if (!indexes.add(option(selected.get(i), options))) throw new Problem(400, "请检查重复选项。");
        JSONArray correct = question.getJSONArray("answer");
        if (correct.length() != selected.length()) return "wrong";
        for (int i = 0; i < correct.length(); i++) {
            int index = correct.getInt(i);
            if (type.equals("order") ? selected.getInt(i) != index : !indexes.contains(index)) return "wrong";
        }
        return "correct";
    }

    private static int option(Object value, int count) throws Problem {
        if (value instanceof Integer && (Integer) value >= 0 && (Integer) value < count) return (Integer) value;
        throw new Problem(400, "请选择有效选项。");
    }

    private static String normalize(String value, boolean caseSensitive) {
        String clean = Normalizer.normalize(value, Normalizer.Form.NFKC).replaceAll("[\\x09-\\x0D\\p{Z}\\uFEFF]+", "").replaceFirst("[。.!！]$", "");
        return caseSensitive ? clean : clean.toLowerCase(Locale.ROOT);
    }
}
