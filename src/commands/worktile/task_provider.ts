import * as fs from "fs";
import axios from "axios";
import * as path from "path";
import * as vscode from "vscode";
import { ROOT_PATH, PROJECT_DIR } from "../../config";
import { lowerCase, find } from "lodash";
import { WorkTileTaskNode, WorkTileTaskNodeType } from "./typing";

const DEFAULT_NODE: WorkTileTaskNode = {
  id: "",
  tags: [],
  title: "暂无数据",
  route_link: "",
  identifier: "",
  type: WorkTileTaskNodeType.other
};

export class WorkTileTaskProvider {
  private _cookie: string;
  private _reLoginCounter: number = 0;
  static loadConfig(): Promise<{
    password: string;
    signin_name: string;
    server_port: number;
  }> {
    return new Promise(res => {
      try {
        const config_path = path.join(
          ROOT_PATH,
          PROJECT_DIR,
          "worktile_config.js"
        );
        if (fs.existsSync(config_path)) {
          res(__non_webpack_require__(config_path));
        } else {
          res(undefined);
          vscode.window.showErrorMessage(`不存在路径 ${config_path}`);
        }
      } catch (e) {
        res(undefined);
        vscode.window.showErrorMessage("加载配置文件错误❎");
      }
    });
  }

  apiFetchAuth(config: {
    password: string;
    signin_name: string;
  }): Promise<
    | {
        cookie_string: string;
        pass_token: string;
      }
    | undefined
  > {
    return new Promise(res => {
      return axios({
        method: "POST",
        url:
          "https://worktile.com/api/pontus/security/exchange/pass-token/by-password",
        data: {
          ...config
        }
      })
        .then(auth => {
          console.log(auth, "auth");
          const cookie_string = auth.headers["set-cookie"].join(";");
          const pass_token = auth.data.data.pass_token;
          res({
            pass_token,
            cookie_string
          });
        })
        .finally(() => {
          res(undefined);
        });
    });
  }

  apiSignIn(cookie_string: string, pass_token: string): Promise<string> {
    return new Promise(res => {
      axios({
        url: "https://worktile.com/api/pontus/user/signin",
        method: "POST",
        headers: {
          cookie: cookie_string
        },
        data: {
          team_id: "5caadf0c9e92715e2ce24984",
          pass_token: pass_token
        }
      })
        .then(signin => {
          const next_cookie_string = signin.headers["set-cookie"].join(";");
          res(next_cookie_string);
        })
        .finally(() => {
          res("");
        })
        .catch(e => {
          vscode.window.showErrorMessage("登录失败");
          res("");
        });
    });
  }

  async setCookie(progress?: vscode.Progress<any>): Promise<void> {
    const config = await WorkTileTaskProvider.loadConfig();
    if (!config) {
      return;
    }
    progress && progress.report({ increment: 10, message: "读取配置文件..." });
    const auth = await this.apiFetchAuth(config);
    progress && progress.report({ increment: 30, message: "登录worktile..." });
    const cookie = await this.apiSignIn(auth.cookie_string, auth.pass_token);
    if (cookie) this._cookie = cookie;
  }

  async apiSearchTask(id: string, progress?: vscode.Progress<any>) {
    if (!this._cookie) {
      await this.setCookie(progress);
    }
    if (this._cookie) {
      progress &&
        progress.report({ increment: 50, message: "请求任务数据..." });
      return await axios({
        url: `https://letote.worktile.com/api/mission-vnext/tasks/no/${lowerCase(
          id
        )}?t=${new Date().getTime()}`,
        headers: {
          cookie: this._cookie
        }
      });
    }
  }

  async apiGetTaskByTaskId(id: string): Promise<WorkTileTaskNode | undefined> {
    const data = await axios({
      url: `https://letote.worktile.com/api/mission-vnext/tasks/${id}?t=${new Date().getTime()}`,
      headers: {
        cookie: this._cookie
      }
    });
    if (data.status === 200) {
      const rdata: {
        _id: string;
        // 标题分析器采用分隔符
        title: string;
        identifier: string; // DEV{identifier}
        // 在comments 找一个 link 链接 用于分享对应页面
        comments: {
          content: string;
          updated_at: number;
        }[];
        properties: {
          desc: {
            value: string;
            updated_at: number;
          };
        };
        task_type_id: string;
        parent_id: string;
      } = data.data.data.value;
      let parent = undefined;
      if (rdata.parent_id) {
        parent = await this.apiGetTaskByTaskId(rdata.parent_id);
      }
      const tag_comment = find(
        rdata.comments,
        c => c.content && /^tag/.test(c.content.replace(/\s/g, ""))
      );
      const user_comment = find(
        rdata.comments,
        c => c.content && /^user/.test(c.content.replace(/\s/g, ""))
      );
      const link_comment = find(
        rdata.comments,
        c => c.content && /^link/.test(c.content.replace(/\s/g, ""))
      );
      let type: WorkTileTaskNodeType = WorkTileTaskNodeType.other;
      if (rdata.task_type_id === WorkTileTaskNodeType.bug) {
        type = WorkTileTaskNodeType.bug;
      }
      if (rdata.task_type_id === WorkTileTaskNodeType.demand) {
        type = WorkTileTaskNodeType.demand;
      }

      let tags = [];
      if (tag_comment && tag_comment.content) {
        tags = tag_comment.content.replace(/^tag(\:|\：)/, "").split(",");
      }
      let user = undefined;
      if (user_comment && user_comment.content) {
        const user_email = user_comment.content.replace(/^user(\:|\：)/g, "");
        user = {
          email: user_email,
          password: ""
        };
      }

      return {
        user,
        type,
        tags,
        parent,
        id: rdata._id,
        title: rdata.title,
        identifier: rdata.identifier,
        route_link: (link_comment && link_comment.content) || ""
      };
    }
    return undefined;
  }

  async apiGetMyTasks(
    progress?: vscode.Progress<any>
  ): Promise<WorkTileTaskNode[]> {
    progress && progress.report({ increment: 0 });

    if (!this._cookie) {
      await this.setCookie(progress);
    }
    if (!this._cookie) {
      // if (this._reLoginCounter > 6) {
      // this._reLoginCounter = 0;
      return [DEFAULT_NODE];
      // }
      // await new Promise(res => setTimeout(() => res(true), 3000));
      // vscode.window.showInformationMessage("登录失败，正在重试");
      // this._reLoginCounter++;
      // return await this.apiGetMyTasks(progress);
    }

    if (this._cookie) {
      progress &&
        progress.report({ increment: 50, message: "请求任务数据..." });
      const data = await axios({
        url: `https://letote.worktile.com/api/mission-vnext/work/my/directed/active?t=${new Date().getTime()}`,
        headers: {
          cookie: this._cookie
        }
      });
      let isFailed = false;
      if (data.status !== 200) {
        isFailed = true;
      }
      if (data.status === 200) {
        const tasks = data.data.data && data.data.data.value;
        if (!tasks) {
          isFailed = true;
        } else {
          const res_tasks: WorkTileTaskNode[] = await Promise.all(
            tasks.map(rtask =>
              Promise.race([
                this.apiGetTaskByTaskId(rtask._id),
                new Promise(res => setTimeout(() => res(undefined), 5000))
              ])
            )
          );
          return res_tasks.filter(a => !!a);
        }
      }
      if (isFailed) {
        vscode.window.showErrorMessage("请求任务数据失败");
      }
    }

    return [DEFAULT_NODE];
  }
}
