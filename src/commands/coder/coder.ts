import * as vscode from "vscode";
import * as fs from "fs";
import * as express from "express";
import * as http from "http";
import { vscodeInsertText } from "../../extensionUtil";

export class CoderCommand {
  private _server: http.Server;

  constructor(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand(
      "LeAppPlugin.startLeCoderServer",
      this.initServer.bind(this)
    );
    vscode.commands.registerCommand("LeAppPlugin.closeLeCoderServer", () => {
      this._server.close();
      this._server = undefined;
      vscode.window.showInformationMessage("已关闭");
    });

    vscode.commands.registerCommand("LeAppPlugin.StartLeReactCoder", uri => {
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
    });
  }

  private initServer() {
    const config = {
      server_port: 3778
    };
    if (config) {
      const app = express();
      app.all("*", function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header(
          "Access-Control-Allow-Methods",
          "PUT,POST,GET,DELETE,OPTIONS"
        );
        res.header("X-Powered-By", " 3.2.1");
        res.header("Content-Type", "application/json;charset=utf-8");
        next();
      });
      app.get("/data", (req, res) => {
        if (!this._server) {
          return;
        }
        const query = req.query;
        this._trackData({
          resultString: decodeURIComponent(query.resultString)
        }).then(() => {
          res.send(true);
        });
      });
      this._server = app.listen(config.server_port || 3778, () => {
        vscode.window.showInformationMessage(`已开启编码器`);
      });
    }
  }

  private async _trackData(data: { resultString: string }) {
    console.log(vscode.window.activeTextEditor)
    return vscodeInsertText(x => data.resultString);
  }
}
