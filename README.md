# 放学小书桌

小学一至五年级上下册的练习。用首页顶部切换册次。一、二年级每日练语文和数学，另有自选英语启蒙。数学的「计算专项」按技能分组，每组 8 题。学习记录默认显示本册，可切换为同年级已收录的各册统计。安卓和 iOS App 的题库和听力随版本安装，电脑端通过 `启动学习网页.cmd` 打开。

「四城任务」覆盖十册的 208 个核心考点，每个考点在北京、上海、广州、深圳各有 8 道变式。可先选城市与学科，再按基础识记、易错辨析、读料提取和情境应用选练。每个考点每种问法有 2 道，提交后显示两条解题思路或自查方法。素材与参数在 [`city-bank.js`](city-bank.js)，既有题号与四城变式题号分别保留，更新时延续已发布的题号和含义。

## 随课程进度发布新版

1. 在 [`index.html`](index.html) 的 `question-bank` 里添加本次课程的考点和配套题。每个考点按基础识记、易错辨析、材料提取、情境应用的顺序给出四道题。已有题目由考点 `id` 和题目位置共同识别，更新时保留已有编号和顺序。需要增加新内容时，使用新的考点 `id`，便于旧答案和错题继续对应原题。
2. 每次发布题库补充，**只把版本号最后一位加 1**，例如 `1.4.1 → 1.4.2 → 1.4.3`。运行 `node scripts/release-version.cjs --bump-patch` 同步 Android 和 iOS 版本号，并分别将 Android 的 `versionCode` 和 iOS 的构建号加 1。之后用 `node scripts/release-version.cjs --check` 核对版本。
3. 在这台电脑的项目目录打开 PowerShell，使用原签名打包。脚本会同时把题库写入界面和判分所用的资源，并校验 APK 签名。

   ```powershell
   .\android\build.ps1 -Output '.\StudyDesk-Android-v1.4.1.apk'
   ```

4. 提交题库和版本号改动，为该版本打 `v版本号` 标签。GitHub Actions 生成 iOS 的 Release 设备归档。把原签名 Android APK 和标明签名状态的 iOS 归档附在同一个 GitHub Release。发布说明列清楚本次新增的学科和单元。
5. 安卓手机下载 APK 覆盖安装。iOS 的签名与分发步骤见下文。升级后检查新版题目和之前的学习记录。

本机打包工具与安卓签名保存在 `%LOCALAPPDATA%\StudyDeskAndroidTools`。`study-desk-key.p12` 和 `study-desk-key-password.clixml` 用于延续旧版本的签名，后者由当前 Windows 用户加密。把两者在本机妥善备份。仓库提交源码和题库，APK 放在 Release，学习数据与签名文件保存在本机。

三年级上册计算专项和下册题库可分别运行 `node scripts/update-math-drills.cjs` 和 `node scripts/update-spring-bank.cjs` 更新到 `index.html`。新册次使用新的 `book` 值和新的考点 `id`。上册的历史题号按原规则保留。

一、二年级的四册题库由 `node scripts/update-early-bank.cjs` 更新到 `index.html`。执行 `node scripts/update-early-bank.cjs --transcripts` 可列出需配音的题号和英文文本。

四年级上下册由 `node scripts/update-fourth-bank.cjs` 更新到 `index.html`。每册含 96 道考点基础题、96 道计算专项题和 768 道四城变式。用 `--transcripts` 可列出 12 段英语录音的题号与原文；复用现有内置录音时直接运行脚本即可。

五年级上下册由 `node scripts/update-fifth-bank.cjs` 更新基础题、计算专项与四城语言练习。每册新增 960 道题，另附 6 段英语录音。执行 `--transcripts` 可查看这 12 段录音的题号与原文。

## iPhone 和 iPad

iOS 版支持 iOS 16 或 iPadOS 16 及以上。Xcode 构建时会直接打包同一份题库、界面和听力。账号、正确率和错题保存在设备上的 SQLite 数据库里。可以在 App 登录同名账号后，使用「导入电脑记录」选择网页端下载的 JSON 文件。

1. 在 Mac 上安装 Xcode 和 Node.js 22 或以上版本，打开 [`ios/StudyDesk.xcodeproj`](ios/StudyDesk.xcodeproj)。
2. 选择 iPhone 或 iPad 模拟器，点 Run。若 Xcode 找不到 Node.js，可在 Build Settings 中设置 `NODE_BINARY` 为 Node.js 可执行文件的绝对路径。
3. 要安装到实体设备，连接 iPhone 或 iPad，在 Signing & Capabilities 中为 StudyDesk 选择自己的 Apple 签名团队，并使用团队可注册的 Bundle Identifier。以后用同一团队和 Bundle Identifier 更新，以保留原安装的学习数据。[Apple 真机运行说明](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)

### iOS 签名和分发

- GitHub Release 中的 `unsigned-xcarchive.zip` 是 Release 配置的设备归档，可用于检查构建内容。安装到 iPhone 或 iPad 需要 Apple 签名。
- 在 Mac 上用符合 Apple 提交要求的 Xcode 打开项目，确认 Signing & Capabilities 中的 Apple Developer 团队和已注册的 Bundle Identifier。选择通用 iOS 设备，执行 **Product → Archive**。在 Organizer 选择 **TestFlight & App Store** 上传，或用 **Release Testing** 为已注册设备导出安装包。[Apple 分发说明](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- 首次提交时，在 App Store Connect 创建对应 App，并填写年龄分级和 App 隐私资料。隐私政策链接使用[放学小书桌 iOS 隐私说明](https://github.com/henryredzl/fangxue-study-desk/blob/main/PRIVACY.md)。
