import * as vscode from "vscode";
import { FileImportUtil } from "le-ts-code-tool";
import { ROOT_PATH } from "./config";

/**
 * vscode打开文件[绝对路径]
 *
 * @export
 * @param {string} trueFsPath
 */
export function GotoTextDocument(trueFsPath: string, location?: any) {
  if (!trueFsPath) {
    vscode.window.showInformationMessage(`不存在打开路径`);
  } else {
    try {
      vscode.workspace.openTextDocument(trueFsPath).then(doc => {
        vscode.window.showTextDocument(doc, { preview: false }).then(editor => {
          if (location) {
            const newSelection = new vscode.Selection(
              new vscode.Position(
                location.range.start.line,
                location.range.start.character
              ),
              new vscode.Position(
                location.range.end.line,
                location.range.end.character
              )
            );
            editor.selection = newSelection;
            editor.revealRange(newSelection);
          }
        });
      });
    } catch (e) {
      vscode.window.showInformationMessage(`无法打开${trueFsPath}`);
    }
  }
}

export async function GotoTextDocumentWithFilePaths(files: string[]) {
  let success: string[] = [];
  let errors: string[] = [];

  for (const filePath of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc, {
        preview: false
      });
      success.push(filePath);
    } catch (e) {
      errors.push(filePath);
    }
  }
  if (errors.length) {
    vscode.window.showInformationMessage(
      "无法打开",
      ...errors.map(ePath => `${ePath}`)
    );
  }
  return success;
}

/**
 * vscode pick 文件列表并打开选中文件 [绝对路径]
 *
 * @export
 * @param {string[]} files
 */
export function pickFiles2Open(
  files: { label: string; target?: string; location?: any }[],
  isOpenFirst = true,
  placeHolder = "请选择打开的文件",
  props: { onPick?: Function } = {}
) {
  if (!files.length) {
    vscode.window.showInformationMessage("暂无结果");
    return;
  }
  if (files.length === 1 && isOpenFirst) {
    if (files[0].location) {
      if (props.onPick) {
        props.onPick(files[0]);
        return;
      }
      GotoTextDocument(
        FileImportUtil.getFileAbsolutePath(
          files[0].location.filePath,
          ROOT_PATH,
          false
        ),
        files[0].location
      );
    }
    GotoTextDocument(
      FileImportUtil.getFileAbsolutePath(files[0].target, ROOT_PATH, false)
    );
  } else {
    if (files.length) {
      vscode.window
        .showQuickPick(files, {
          placeHolder
        })
        .then(result => {
          if (props.onPick) {
            props.onPick(result);
            return;
          }
          if (result && result.location) {
            GotoTextDocument(
              FileImportUtil.getFileAbsolutePath(
                result.location.filePath,
                ROOT_PATH,
                false
              ),
              result.location
            );
          }
          if (result && result.target) {
            GotoTextDocument(
              FileImportUtil.getFileAbsolutePath(
                result.target,
                ROOT_PATH,
                false
              )
            );
          }
        });
    }
  }
}

export function vscodeInsertText(
  getText: (i: number) => string,
  i: number = 0,
  wasEmpty: boolean = false
) {
  let activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }

  let sels = activeEditor.selections;

  if (i > 0 && wasEmpty) {
    sels[i - 1] = new vscode.Selection(sels[i - 1].end, sels[i - 1].end);
    activeEditor.selections = sels; // required or the selection updates will be ignored! 😱
  }

  if (i < 0 || i >= sels.length) {
    return;
  }

  let isEmpty = sels[i].isEmpty;
  activeEditor
    .edit(edit => edit.replace(sels[i], getText(i)))
    .then(x => {
      vscodeInsertText(getText, i + 1, isEmpty);
    });
}
