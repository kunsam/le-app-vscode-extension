import * as vscode from "vscode";

import { WorkTileTreeView } from "./worktile_tree_view";
import { CommonUIViewNode } from "./typing";
import NavigatorsCommand from "../router";
import {
  FileImportUtil,
  LeFileContentManager,
  LeAppNavigator
} from "le-ts-code-tool";
import { ROOT_PATH, CONTENT_MANAGER_CONFIG } from "../../config";
import {
  GotoTextDocument,
  GotoTextDocumentWithFilePaths
} from "../../extensionUtil";
import WorktileCommandUtil from "./command_util";
import { WorkTileTaskProvider } from "./task_provider";
import * as express from "express";
import * as http from "http";
import * as UrlParse from "url-parse";

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
    // https://localhost:3600/bug?link=https://wechat-staging1.letote.cn/home&user=sam@letote.cn&tags=%E9%A1%BA%E4%B8%B0%E5%8D%95%E5%8F%B7,%E5%93%88%E5%93%88%E5%93%88
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
          link: query.link,
          tags: (query.tags && query.tags.split(",")) || []
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

  async searchCodeWithWorkTileNode(selectedNode: CommonUIViewNode) {
    this._trackCodeWithData({
      tags: selectedNode._origin.tags,
      link: selectedNode._origin.route_link
        .replace(/^link(\:|\：)/, "")
        .replace(/\s/g, "")
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
    // 代码追踪
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.searchCodeWithWorkTileNode",
        this.searchCodeWithWorkTileNode.bind(this)
      )
    );
  }

  private async _trackCodeWithData(data: { link: string; tags: string[] }) {
    let link = data.link;
    if (link) {
      if (!this._routerCommand.navigatorTree) {
        await vscode.commands.executeCommand("LeAppPlugin.activeRouterManager");
      }
      try {
        const parsed = UrlParse(link);
        link = parsed.pathname.split("?")[0];
      } catch (e) {
        vscode.window.showInformationMessage("存在Link但解析失败");
      }
      const names = link
        .split("/")
        .map(d => (isNaN(parseInt(d)) ? d : parseInt(d)))
        .filter(a => a !== "");

      // 动态映射成静态
      const map_names = WorktileCommandUtil.routerParamsMap(names);
      link = "/" + map_names.join("/");
      let componentRelativePath = this._routerCommand.navigatorTree.queryNavigatorByName(
        link
      );

      if (!componentRelativePath) {
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
            placeHolder: link
          }
        );
        componentRelativePath = this._routerCommand.navigatorTree.queryNavigatorByName(
          result.label
        );
      }
      if (componentRelativePath) {
        const filePath = FileImportUtil.getFileAbsolutePath(
          componentRelativePath,
          ROOT_PATH,
          true
        );
        GotoTextDocument(filePath);
      }

      let isHasShowResult = !!componentRelativePath;

      if (data.tags) {
        let tags_file_paths_map = new Map();
        data.tags.forEach(tag => {
          this._leConentManager.queryChineseCharacter(tag).forEach(filepath => {
            tags_file_paths_map.set(filepath, true);
          });
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
      }
    }
  }
}
