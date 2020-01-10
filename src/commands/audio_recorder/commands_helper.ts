
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ROOT_PATH } from "../../config";

export class CommandsHelpers {
  public static async gitPush() {
		await vscode.commands.executeCommand("git.push");
    vscode.env.openExternal(
      vscode.Uri.parse("https://github.com/letotecn/app/pulls")
    )
	}
	
	public static insertContainer() {
		const uri = vscode.window.activeTextEditor.document.uri;
		if (!uri) {
			vscode.window.showInformationMessage("不存在打开的文档");
			return;
		}
		const containerPath = uri.fsPath

		const containerFileString = fs.readFileSync(containerPath, 'utf-8')
		let containerName = 'containerName'
		const target = containerFileString.match(/class\s(\w)+\sextends/)[0]
		if (!target) {
			vscode.window.showInformationMessage('未找到容器名称, 请自行修改')
		}
		containerName = target.replace('class', '').replace(/\s/g, '').replace('extends', '')
		const containerFilePath = path.join(ROOT_PATH, '/src/containers/index.js')

		const insertText = `import ${containerName} from '${path.relative(containerPath, containerFilePath)}'\n\n`
		insertTextAtFile(containerFilePath, insertText, 'export')
		insertTextAtFileLineBreakStart(containerFilePath, `\n  ${containerName},`, 'export {')
		// if (!b1 || b2) {
		// 	vscode.window.showInformationMessage(`containers/index.js 已插入`)
		// }
		const navigationContainerPath = path.join(ROOT_PATH, '/src/navigation/index.js')
		insertTextAtFile(navigationContainerPath, `,\n  ${containerName}`, `} from '../containers'`, -1)
		insertTextAtFileLineBreakStart(navigationContainerPath, `\n      ${containerName.replace('Container', '')}: { screen: ${containerName} },`, `Root: { screen: RootContainer, path: 'Root' },`)
	}
}

function insertTextAtFile(filePath: string, content: string, tag: string, offset: number = 0) {
	const fileString = fs.readFileSync(filePath, 'utf-8')
	// if (fileString.includes(content)) {
	// 	return false
	// }
	const insertIndex = fileString.indexOf(tag) + offset;
	const pre = fileString.slice(0, insertIndex);
	const suf = fileString.slice(insertIndex);
	fs.writeFileSync(filePath, `${pre}${content}${suf}`);
	return true
}

function insertTextAtFileLineBreakStart(filePath: string, content: string, tag: string) {
	const fileString = fs.readFileSync(filePath, 'utf-8')
	// if (fileString.includes(content)) {
	// 	return false
	// }
	const insertIndex = fileString.indexOf(tag) + tag.length;
	const pre = fileString.slice(0, insertIndex);
	const suf = fileString.slice(insertIndex);
	fs.writeFileSync(filePath, `${pre}${content}${suf}`);
	return true
}