import * as vscode from "vscode";
import * as fs from "fs";

export class CoderCommand {
  constructor(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand(
      "LeAppPlugin.StartLeReactCoder",
      uri => {
        const path = uri.path;
        if (!/\.html$/.test(path)) {
          vscode.window.showErrorMessage("目标文件有误");
          return;
        }
        const fileString = fs.readFileSync(path, "utf-8");
        const jsFilePath =
          "https://kunsam.coding.net/p/le-htmlui-coder/d/le-htmlui-coder/git/raw/master/dist/main.js";
        const script_string = `<script type="application/javascript" src="${jsFilePath}"></script>\n`;
        if (fileString.indexOf(script_string) > 0) {
          vscode.env.openExternal(uri);
          return;
        }
        const insertIndex = fileString.indexOf("<meta");
        const pre = fileString.slice(0, insertIndex);
        const suf = fileString.slice(insertIndex);
        fs.writeFileSync(path, `${pre}${script_string}${suf}`);
        vscode.env.openExternal(uri);
      }
    );
  }
}
