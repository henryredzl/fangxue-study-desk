import Foundation
import UIKit
import UniformTypeIdentifiers
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Study Desk", sessionRole: session.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = StudyViewController()
        self.window = window
        window.makeKeyAndVisible()
    }
}

private let studyHome = URL(string: "studydesk://app/index.html")!

private final class OfflineAssets: NSObject, WKURLSchemeHandler {
    let directory: URL
    private let contentTypes = [
        "/index.html": "text/html", "/city-bank.js": "text/javascript", "/account.js": "text/javascript",
        "/account.css": "text/css", "/mobile.css": "text/css"
    ]

    init(directory: URL) { self.directory = directory }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, task.request.httpMethod == "GET",
              url.scheme == studyHome.scheme, url.host == studyHome.host,
              let mime = contentTypes[url.path],
              let bytes = try? Data(contentsOf: directory.appendingPathComponent(String(url.path.dropFirst()))) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: bytes.count, textEncodingName: "UTF-8"))
        task.didReceive(bytes)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

private final class StudyBridge: NSObject, WKScriptMessageHandlerWithReply {
    typealias Reply = (Any?, String?) -> Void
    weak var controller: StudyViewController?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping Reply) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url == studyHome,
              let payload = message.body as? StudyStore.JSON,
              let path = payload["path"] as? String,
              let body = payload["body"] as? StudyStore.JSON,
              let bytes = try? JSONSerialization.data(withJSONObject: body), bytes.count <= 8_192,
              let controller = controller else {
            replyHandler(["status": 400, "data": ["error": "请求内容不正确。"]], nil)
            return
        }
        controller.request(path, body: body, reply: replyHandler)
    }
}

private final class StudyViewController: UIViewController, WKNavigationDelegate, UIDocumentPickerDelegate {
    private let files = Bundle.main.bundleURL.appendingPathComponent("WebAssets", isDirectory: true)
    private let databaseQueue = DispatchQueue(label: "com.fangxue.studydesk.database", qos: .userInitiated)
    private var database: StudyStore?
    private var webView: WKWebView!
    private var pendingImport: (destination: Int, reply: StudyBridge.Reply)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 246/255.0, green: 248/255.0, blue: 252/255.0, alpha: 1)
        guard FileManager.default.fileExists(atPath: files.appendingPathComponent("index.html").path) else {
            showMissingAssets()
            return
        }
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.setURLSchemeHandler(OfflineAssets(directory: files), forURLScheme: "studydesk")
        let bridge = StudyBridge()
        bridge.controller = self
        configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "studyDesk")
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: safe.trailingAnchor),
            webView.topAnchor.constraint(equalTo: safe.topAnchor),
            webView.bottomAnchor.constraint(equalTo: safe.bottomAnchor)
        ])
        webView.load(URLRequest(url: studyHome))
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.request.url == studyHome, action.targetFrame?.isMainFrame == true {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        if action.navigationType == .linkActivated, action.sourceFrame.isMainFrame,
           let url = action.request.url {
            if url.scheme == "https" { UIApplication.shared.open(url) }
            if url.scheme == studyHome.scheme, url.host == studyHome.host, url.fragment == "main" {
                webView.evaluateJavaScript("document.querySelector('#main')?.focus()")
            }
        }
    }

    private func showMissingAssets() {
        let label = UILabel()
        label.text = "无法加载学习内容，请重新安装应用。"
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.9)
        ])
    }

    private func openStore() throws -> StudyStore {
        if let database = database { return database }
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                                   appropriateFor: nil, create: true)
        let store = try StudyStore(databaseURL: directory.appendingPathComponent("study.sqlite"),
                                   bankURL: files.appendingPathComponent("question-bank.json"))
        database = store
        return store
    }

    private static func response(_ status: Int, _ data: StudyStore.JSON = [:]) -> StudyStore.JSON {
        ["status": status, "data": data]
    }

    private static func failure(_ error: Error) -> StudyStore.JSON {
        if let problem = error as? StudyProblem { return response(problem.status, ["error": problem.message]) }
        return response(500, ["error": "暂时无法保存，请重试。"])
    }

    func request(_ path: String, body: StudyStore.JSON, reply: @escaping StudyBridge.Reply) {
        databaseQueue.async {
            do {
                let store = try self.openStore()
                if path == "choose-import" {
                    guard let id = try store.signedInID() else { throw StudyProblem(401, "请先登录学习账号。") }
                    DispatchQueue.main.async { self.presentImport(destination: id, reply: reply) }
                } else if path == "delete-account" {
                    guard let id = try store.signedInID(), body["accountId"] as? Int == id else {
                        throw StudyProblem(401, "请登录要删除的账号后重试。")
                    }
                    DispatchQueue.main.async { self.confirmDeletion(id: id, reply: reply) }
                } else {
                    let output = Self.response(200, try store.request(path, body: body))
                    DispatchQueue.main.async { reply(output, nil) }
                }
            } catch {
                let output = Self.failure(error)
                DispatchQueue.main.async { reply(output, nil) }
            }
        }
    }

    private func confirmDeletion(id: Int, reply: @escaping StudyBridge.Reply) {
        guard presentedViewController == nil else {
            reply(Self.response(409, ["error": "请关闭当前窗口后重试。"]), nil)
            return
        }
        let alert = UIAlertController(title: "删除本机账号？", message: "该账号和本机答题记录都将被永久删除。", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in reply(Self.response(204), nil) })
        alert.addAction(UIAlertAction(title: "删除账号", style: .destructive) { _ in
            self.databaseQueue.async {
                let output: StudyStore.JSON
                do { output = Self.response(200, try self.openStore().deleteAccount(id: id)) }
                catch { output = Self.failure(error) }
                DispatchQueue.main.async { reply(output, nil) }
            }
        })
        present(alert, animated: true)
    }

    private func presentImport(destination: Int, reply: @escaping StudyBridge.Reply) {
        guard pendingImport == nil, presentedViewController == nil else {
            reply(Self.response(409, ["error": "已有文件选择窗口，请完成后重试。"]), nil)
            return
        }
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json])
        picker.delegate = self
        pendingImport = (destination, reply)
        present(picker, animated: true)
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingImport?.reply(Self.response(204), nil)
        pendingImport = nil
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let pending = pendingImport else { return }
        pendingImport = nil
        guard let file = urls.first else {
            pending.reply(Self.response(204), nil)
            return
        }
        databaseQueue.async {
            let output: StudyStore.JSON
            do {
                let scoped = file.startAccessingSecurityScopedResource()
                defer { if scoped { file.stopAccessingSecurityScopedResource() } }
                let handle = try FileHandle(forReadingFrom: file)
                defer { try? handle.close() }
                var data = Data()
                while let part = try handle.read(upToCount: 65_536), !part.isEmpty {
                    guard part.count + data.count <= StudyStore.maxImportBytes else {
                        throw StudyProblem(400, "学习记录文件超过 12 MB，无法导入。")
                    }
                    data.append(part)
                }
                output = Self.response(200, try self.openStore().importRecords(destination: pending.destination, data: data))
            } catch {
                output = Self.failure(error)
            }
            DispatchQueue.main.async { pending.reply(output, nil) }
        }
    }
}
