import * as vscode from "vscode";

import { WorkTileTreeView } from "./worktile_tree_view";
import { CommonUIViewNode } from "./typing";
import NavigatorsCommand from "../router";
import { LeFileContentManager, LeAppNavigator } from "le-ts-code-tool";
import { CONTENT_MANAGER_CONFIG } from "../../config";
import {
  GotoTextDocument,
  GotoTextDocumentWithFilePaths
} from "../../extensionUtil";
import { WorkTileTaskProvider } from "./task_provider";
import * as express from "express";
import * as http from "http";

export default class WorktileCommand {
  private _server: http.Server;
  private _view: WorkTileTreeView;
  private _routerCommand: NavigatorsCommand;
  private _leConentManager: LeFileContentManager;

  constructor(
    context: vscode.ExtensionContext,
    routerCommand: NavigatorsCommand
  ) {
    this.initCommnd(context);
    this._routerCommand = routerCommand;
    this._leConentManager = new LeFileContentManager(CONTENT_MANAGER_CONFIG);
  }

  async initBugServer() {
    const config = await WorkTileTaskProvider.loadConfig();
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
      app.get("/bug", (req, res) => {
        if (!this._server) {
          return;
        }
        const query = req.query;
        this._trackCodeWithData({
          navigatorName: query.navigatorName,
          userPhone: query.userPhone,
          tag: decodeURIComponent(query.tag)
        }).then(() => {
          res.send(true);
        });
      });
      this._server = app.listen(config.server_port || 3777, () => {
        vscode.window.showInformationMessage(
          `已开启代码跟踪服务器 on port ${config.server_port || 3777}`
        );
      });
    }
  }

  refreshWorkTileTasks() {
    this._view.reset().then(() => {
      vscode.window.showInformationMessage("更新成功");
    });
  }

  openWorkTileTaskInBroswer(selectedNode: CommonUIViewNode) {
    const id = selectedNode._origin.identifier;
    vscode.env.clipboard.writeText(`#DEV${id}`).then(() => {
      vscode.window.showInformationMessage(`#DEV${id}已写入剪切板`);
      vscode.env.openExternal(
        vscode.Uri.parse("https://letote.worktile.com/mission/my/directed")
      );
    });
  }

  initCommnd(context: vscode.ExtensionContext) {
    this._view = new WorkTileTreeView();
    this._view.init();

    vscode.commands.registerCommand(
      "LeAppPlugin.startTrackCodeServer",
      this.initBugServer.bind(this)
    );
    vscode.commands.registerCommand("LeAppPlugin.closeTrackCodeServer", () => {
      this._server.close();
      this._server = undefined;
      vscode.window.showInformationMessage("已关闭代码跟踪服务器");
    });

    vscode.commands.registerCommand(
      "LeAppPlugin.refreshWorkTileTasks",
      this.refreshWorkTileTasks.bind(this)
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.openWorkTileTaskInBroswer",
        this.openWorkTileTaskInBroswer.bind(this)
      )
    );
  }

  private async _trackCodeWithData(data: {
    navigatorName: string;
    tag: string;
    userPhone: string;
  }) {
    const { navigatorName, userPhone, tag } = data;
    if (navigatorName) {
      if (!this._routerCommand.navigatorTree) {
        await vscode.commands.executeCommand("LeAppPlugin.activeRouterManager");
      }

      let fsPath = this._routerCommand.navigatorTree.queryNavigatorByName(
        navigatorName
      );

      if (!fsPath) {
        vscode.window.showInformationMessage(
          "自动分析失败，请根据提示手动确认路由路径"
        );
        const result: any = await vscode.window.showQuickPick(
          this._routerCommand.navigatorTree.navigators.map(
            (r: LeAppNavigator) => ({
              label: r.name
            })
          ),
          {
            placeHolder: navigatorName
          }
        );
        fsPath = this._routerCommand.navigatorTree.queryNavigatorByName(
          result.label
        );
      }
      if (fsPath) {
        GotoTextDocument(fsPath);
      }

      let isHasShowResult = !!fsPath;
      if (tag) {
        let tags_file_paths_map = new Map();
        this._leConentManager.queryChineseCharacter(tag).forEach(filepath => {
          tags_file_paths_map.set(filepath, true);
        });
        if (tags_file_paths_map.size > 0) {
          if (tags_file_paths_map.size <= 4) {
            let open_files = [];
            tags_file_paths_map.forEach((_, key) => {
              open_files.push(key);
            });
            const success = await GotoTextDocumentWithFilePaths(open_files);
            if (success.length) {
              isHasShowResult = true;
            }
          } else {
            vscode.window.showWarningMessage("结果过多，请自己搜索");
          }
        }
      }

      if (!isHasShowResult) {
        vscode.window.showInformationMessage(
          "未能找到节点代码位置，请指定link/tag"
        );
      } else {
        vscode.window.showInformationMessage(`加载成功!用户手机号已复制`);
        vscode.env.clipboard.writeText(userPhone);
      }
    }
  }
}
