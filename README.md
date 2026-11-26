# 放学小书桌

小学三年级上册的语文、数学和英语练习。安卓 App 把题库和听力随 APK 一起安装，练习与统计可以离线使用。电脑端通过 `启动学习网页.cmd` 打开。数学的「计算专项」按技能分组，每组 8 题。

## 随课程进度发布新版

1. 在 [`index.html`](index.html) 的 `question-bank` 里添加本次课程的考点和配套题。每个考点按基础识记、易错辨析、材料提取、情境应用的顺序给出四道题。已有题目由考点 `id` 和题目位置共同识别，更新时保留已有编号和顺序。需要增加新内容时，使用新的考点 `id`，便于旧答案和错题继续对应原题。
2. 在 [`AndroidManifest.xml`](android/src/main/AndroidManifest.xml) 中将 `versionCode` 增加到高于上一版的整数，填写相应的 `versionName`，例如从 `1.1.0` 升到 `1.1.1`。包名继续使用 `com.fangxue.studydesk`。
3. 在这台电脑的项目目录打开 PowerShell，使用原签名打包。脚本会同时把题库写入界面和判分所用的资源，并校验 APK 签名。

   ```powershell
   .\android\build.ps1 -Output '.\StudyDesk-Android-v1.1.1.apk'
   ```

4. 提交题库和版本号改动，将相应版本打标签并发布到 GitHub 仓库的 **Releases**，把生成的 APK 附在该版本上。发布说明列清楚本次新增的学科和单元。
5. 在手机上下载 APK 后覆盖安装。安装后可以检查新版题目和之前的学习记录。

本机打包工具与安卓签名保存在 `%LOCALAPPDATA%\StudyDeskAndroidTools`。`study-desk-key.p12` 和 `study-desk-key-password.clixml` 用于延续旧版本的签名，后者由当前 Windows 用户加密。把两者在本机妥善备份。仓库提交源码和题库，APK 放在 Release，学习数据与签名文件保存在本机。

计算专项的题目由 [`scripts/update-math-drills.cjs`](scripts/update-math-drills.cjs) 生成。运行 `node scripts/update-math-drills.cjs` 会把这批题写入 `index.html`。每个专项的题号和题目位置同样用于关联历史答题记录，随新版新增专项时使用新的专项 `id`。
