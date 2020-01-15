import * as vscode from "vscode";
import { PROJECT_DIR, ROOT_PATH } from "../../config";
import { CommandsHelpers } from "./commands_helper";
import * as fs from "fs";
import { selectText } from "../../select";
const path = require("path");
const AudioRecorder = require("node-audiorecorder");
const CryptoJS = require("crypto-js");
const WebSocket = require("ws");

const CONFIG = {
  // 请求地址
  hostUrl: "wss://iat-api.xfyun.cn/v2/iat",
  host: "iat-api.xfyun.cn",
  //在控制台-我的应用-语音听写（流式版）获取
  appid: "5c207d64",
  //在控制台-我的应用-语音听写（流式版）获取
  apiSecret: "0b7c2b36238931bd29e5980097616f1d",
  //在控制台-我的应用-语音听写（流式版）获取
  apiKey: "71e6941547ee3d7473cfdd72a25eb98d",
  uri: "/v2/iat",
  highWaterMark: 1280
};

// 帧定义
const FRAME = {
  STATUS_FIRST_FRAME: 0,
  STATUS_CONTINUE_FRAME: 1,
  STATUS_LAST_FRAME: 2
};

// 鉴权签名
function getAuthStr(date) {
  let signatureOrigin = `host: ${CONFIG.host}\ndate: ${date}\nGET ${CONFIG.uri} HTTP/1.1`;
  let signatureSha = CryptoJS.HmacSHA256(signatureOrigin, CONFIG.apiSecret);
  let signature = CryptoJS.enc.Base64.stringify(signatureSha);
  let authorizationOrigin = `api_key="${CONFIG.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  let authStr = CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(authorizationOrigin)
  );
  return authStr;
}

// 传输数据
function getSendData(data, status) {
  let frame: any = "";
  let frameDataSection = {
    status: status,
    format: "audio/L16;rate=16000",
    audio: data.toString("base64"),
    encoding: "raw"
  };
  switch (status) {
    case FRAME.STATUS_FIRST_FRAME:
      frame = {
        // 填充common
        common: {
          app_id: CONFIG.appid
        },
        //填充business
        business: {
          language: "zh_cn",
          domain: "iat",
          accent: "mandarin",
          dwa: "wpgs" // 可选参数，动态修正
        },
        //填充data
        data: frameDataSection
      };
      status = FRAME.STATUS_CONTINUE_FRAME;
      break;
    case FRAME.STATUS_CONTINUE_FRAME:
    case FRAME.STATUS_LAST_FRAME:
      //填充frame
      frame = {
        data: frameDataSection
      };
      break;
  }
  return JSON.stringify(frame);
}

export class AudioRecorderCommands {
  private audioRecorder: any;
  private activeWs: any;
  private isOpenContinueSpeechRecognition: boolean = false;
  constructor(context: vscode.ExtensionContext) {
    this.init(context);
  }

  getCommands() {
    return [
      {
        regs: [/^组件(?!<[\u4e00-\u9fa5]>)。?/, /来个组件/, /组件模板/],
        desc: "创建组件模板",
        onDo: () => {
          vscode.commands.executeCommand("LeAppPlugin.CompletionRNComponent");
        }
      },
      {
        regs: [/^页面(?!<[\u4e00-\u9fa5]>)。?/, /来个页面/, /页面模板/],
        desc: "创建页面模板代码",
        onDo: () => {
          vscode.commands.executeCommand("LeAppPlugin.CompletionRNContainer");
        }
      },
      {
        regs: [/^推送?(?![\u4e00-\u9fa5])/, /推送分支/, /(P|p)ush/],
        desc: "推送分支",
        onDo: () => {
          CommandsHelpers.gitPush();
        }
      },
      {
        regs: [/^拉取?(?![\u4e00-\u9fa5])/, /拉取分支/, /(P|p)ull/],
        desc: "拉取分支",
        onDo: () => {
          vscode.commands.executeCommand("git.fetch");
        }
      },
      {
        regs: [/^历史(?![\u4e00-\u9fa5])/, /文件历史/, ],
        desc: "在gitlens中显示文件历史",
        onDo: () => {
          vscode.commands.executeCommand("gitlens.showFileHistoryInView");
        }
      },
      {
        regs: [/^命令行(?![\u4e00-\u9fa5])/, /terminal/, /Terminal/],
        desc: "打开命令行",
        onDo: () => {
          vscode.commands.executeCommand("workbench.action.terminal.focus");
        }
      },
      {
        regs: [/^调试(?![\u4e00-\u9fa5])/, /调试文件/],
        desc: "模拟调试当前文件",
        onDo: () => {
          vscode.commands.executeCommand("LeAppPlugin.debugCurrentFile");
        }
      },
      {
        regs: [/^注册页面/],
        desc: "在navigation和container文件下写入当前容器引用",
        onDo: () => {
          CommandsHelpers.insertContainer();
        }
      },
      {
        regs: [/^选中/, /选中复制/],
        desc: "在navigation和container文件下写入当前容器引用",
        onDo: () => {
          const text = selectText({ includeBrack: false });
          if (text) {
            vscode.env.clipboard.writeText(text);
          }
        }
      }
    ];
  }
  async handleResult(data: { result: string; status: string }) {
    const { result, status } = data;

    if (status !== "success") {
      vscode.window.showErrorMessage("连接错误，识别失败");
      return;
    }

    let findCommand = false;
    this.getCommands().every(command => {
      command.regs.every(reg => {
        if (reg.test(result)) {
          findCommand = true;
          command.onDo();
          return !findCommand;
        }
      });
      return !findCommand;
    });
  }

  init(context) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.toggleSpeechRecognitionService",
        () => {
          if (this.isOpenContinueSpeechRecognition) {
            this.audioRecorder.stop();
            this.activeWs.close();
            this.isOpenContinueSpeechRecognition = false;
            return;
          }
          this.isOpenContinueSpeechRecognition = true;
          this.continueRecognition();
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.speechRecognition",
        async () => {
          const filePath = await this.start();
          const data = await this.connectAndRecognition(filePath);
          this.handleResult(data as any);
          fs.unlink(filePath, () => {
            if (data.status === "success") {
              vscode.window.showInformationMessage(`识别成功: ${data.result}`);
            }
            if (data.status === "error") {
              vscode.window.showInformationMessage(`识别失败`);
            }
          });
        }
      )
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.checkSpeechRecognitionCommands",
        () => {
          vscode.window.showQuickPick([
            {
              label: "组件模板"
            },
            {
              label: "容器模板"
            },
            {
              label: "推送分支"
            },
            {
              label: "注册页面"
            },
            {
              label: "文件依赖"
            },
            {
              label: "选中复制"
            }
          ]);
        }
      )
    );
  }

  async initRecorder() {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "初始化录音器..."
      },
      () => {
        return new Promise(resolve => {
          const audioRecorder = new AudioRecorder(
            {
              program: process.platform === "win32" ? "sox" : "rec",
              silence: 0
            },
            console
          );
          this.audioRecorder = audioRecorder;
          resolve();
        });
      }
    );
  }

  async start() {
    if (!this.audioRecorder) {
      await this.initRecorder();
    }
    const audioRecorder = this.audioRecorder;
    const fileName = path.join(
      ROOT_PATH,
      PROJECT_DIR,
      Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, "")
        .substr(0, 4)
        .concat(".wav")
    );
    // console.log("Writing new recording file at: ", fileName);
    // Create write stream.
    const fileStream = fs.createWriteStream(fileName, { encoding: "binary" });
    // Start and write to the file.
    vscode.window.setStatusBarMessage("开始录制。", 3000);
    audioRecorder
      .start()
      .stream()
      .pipe(fileStream);
    // Log information on the following events
    audioRecorder.stream().on("close", function(code) {
      console.warn("Recording closed. Exit code: ", code);
    });
    audioRecorder.stream().on("end", function() {
      console.warn("Recording ended.");
    });
    audioRecorder.stream().on("error", function() {
      console.warn("Recording error.");
    });
    // Write incoming data out the console.
    // audioRecorder.stream().on(`data`, function(chunk) {
    //   console.log(chunk);
    // });
    // Keep process alive.
    // process.stdin.resume();
    // console.warn("Press ctrl+c to exit.");
    await new Promise(res => {
      setTimeout(() => {
        res();
      }, 3000);
    });
    audioRecorder.stop();
    return fileName;
  }

  async continueRecognition() {
    if (!this.audioRecorder) {
      await this.initRecorder();
    }

    let date = new Date().toUTCString();
    let status = FRAME.STATUS_FIRST_FRAME;
    // 记录本次识别用sid
    let currentSid = "";
    // 识别结果
    let iatResult = [];
    let wssUrl =
      CONFIG.hostUrl +
      "?authorization=" +
      getAuthStr(date) +
      "&date=" +
      date +
      "&host=" +
      CONFIG.host;
    let ws = new WebSocket(wssUrl);

    const audioRecorder = this.audioRecorder;

    // let isInALoop
    // 连接建立完毕，读取数据进行识别
    ws.on("open", event => {
      console.log("websocket connect!");
      audioRecorder.start().stream();
      // Log information on the following events
      audioRecorder.stream().on("close", function(code) {
        console.warn("Recording closed. Exit code: ", code);
      });
      audioRecorder.stream().on("end", function() {
        console.warn("Recording ended.");
      });
      audioRecorder.stream().on("error", function() {
        console.warn("Recording error.");
      });

      audioRecorder.stream().on(`data`, function(chunk) {
        // const isNoSignificantVoice = getSendData(status, chunk);
        console.log(chunk, "chunkchunk");
        ws.send(getSendData(status, chunk));
      });
    });

    let resultString = "";
    // 得到识别结果后进行处理，仅供参考，具体业务具体对待
    ws.on("message", (data, err) => {
      console.log("message, resultString");
      if (err) {
        console.log(`err:${err}`);
        return;
      }
      const res = JSON.parse(data);
      if (res.code != 0) {
        console.log(`error code ${res.code}, reason ${res.message}`);
        return;
      }
      let str = "";
      if (res.data.status == 2) {
        // res.data.status ==2 说明数据全部返回完毕，可以关闭连接，释放资源
        // str += "最终识别结果";
        currentSid = res.sid;
        ws.close();
      }
      iatResult[res.data.result.sn] = res.data.result;
      if (res.data.result.pgs == "rpl") {
        res.data.result.rg.forEach(i => {
          iatResult[i] = null;
        });
      }
      iatResult.forEach(i => {
        if (i != null) {
          i.ws.forEach(j => {
            j.cw.forEach(k => {
              str += k.w;
            });
          });
        }
      });
      resultString = str;
      console.log(res, resultString, "resultString");
    });

    // 资源释放
    ws.on("close", () => {
      console.log(`本次识别sid：${currentSid}`);
      console.log("connect close!");
    });

    // 建连错误
    ws.on("error", err => {
      console.log("websocket connect err: " + err);
    });
    this.activeWs = ws;
  }
  connectAndRecognition(filePath): Promise<{ result: string; status: string }> {
    return new Promise(uploadResolve => {
      // 获取当前时间 RFC1123格式
      let date = new Date().toUTCString();
      // 设置当前临时状态为初始化
      let status = FRAME.STATUS_FIRST_FRAME;
      // 记录本次识别用sid
      let currentSid = "";
      // 识别结果
      let iatResult = [];

      let wssUrl =
        CONFIG.hostUrl +
        "?authorization=" +
        getAuthStr(date) +
        "&date=" +
        date +
        "&host=" +
        CONFIG.host;
      let ws = new WebSocket(wssUrl);

      // 连接建立完毕，读取数据进行识别
      ws.on("open", event => {
        console.log("websocket connect!");
        var readerStream = fs.createReadStream(filePath, {
          highWaterMark: CONFIG.highWaterMark
        });
        readerStream.on("data", function(chunk) {
          ws.send(getSendData(chunk, status));
        });
        // 最终帧发送结束
        readerStream.on("end", function() {
          status = FRAME.STATUS_LAST_FRAME;
          ws.send(getSendData("", status));
        });
      });

      let resultString = "";
      // 得到识别结果后进行处理，仅供参考，具体业务具体对待
      ws.on("message", (data, err) => {
        if (err) {
          console.log(`err:${err}`);
          uploadResolve({
            result: err,
            status: "error"
          });
          return;
        }
        const res = JSON.parse(data);
        if (res.code != 0) {
          console.log(`error code ${res.code}, reason ${res.message}`);
          return;
        }

        let str = "";
        if (res.data.status == 2) {
          // res.data.status ==2 说明数据全部返回完毕，可以关闭连接，释放资源
          // str += "最终识别结果";
          currentSid = res.sid;
          ws.close();
        } else {
          // str += "中间识别结果";
        }
        iatResult[res.data.result.sn] = res.data.result;
        if (res.data.result.pgs == "rpl") {
          res.data.result.rg.forEach(i => {
            iatResult[i] = null;
          });
          // str += "【动态修正】";
        }
        // str += "：";
        iatResult.forEach(i => {
          if (i != null) {
            i.ws.forEach(j => {
              j.cw.forEach(k => {
                str += k.w;
              });
            });
          }
        });
        resultString = str;
      });

      // 资源释放
      ws.on("close", () => {
        console.log(`本次识别sid：${currentSid}`);
        console.log("connect close!");
        uploadResolve({
          result: resultString,
          status: "success"
        });
      });

      // 建连错误
      ws.on("error", err => {
        console.log("websocket connect err: " + err);
        uploadResolve({
          result: "",
          status: "error"
        });
      });
    });
  }
}
