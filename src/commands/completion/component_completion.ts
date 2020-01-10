
import * as vscode from "vscode";
import { vscodeInsertText } from "../../extensionUtil";
import * as path from 'path'
import { ROOT_PATH } from "../../config";

const RNCOMPONENT_TEXT = `
import React, { Component } from 'react'
import { View, Text } from 'react-native'
export default class ComponentName extends Component {
	render() {
		return (
			<View style={styles.container}>
				<Text>1</Text>
			</View>
		)
	}
}
const styles = StyleSheet.create({
  container: { flex: 1 }
})

`

const GET_RN_CONTAINER_TEXT = (rpath) => `
import React, { Component } from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView, NavigationBar } from '${rpath}'

export default class ContainerName extends Component {

	_goBack = () => {
    this.props.navigation.goBack()
	}

	render() {
		return (
			<SafeAreaView style={styles.container}>
			<NavigationBar
				title={'ContainerNameTitle'}
				leftBarButtonItem={
					<BarButtonItem onPress={this._goBack} buttonType={'back'} />
				}
			/>
				<View style={styles.innerContainer}></View>
			</SafeAreaView>
		)
	}
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	innerContainer: {}
})

`




export class ComponentCompletion {
	constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
				"LeAppPlugin.CompletionRNComponent",
				() => {
					vscodeInsertText(x => RNCOMPONENT_TEXT);
				}
			)
		)
		context.subscriptions.push(
      vscode.commands.registerCommand(
				"LeAppPlugin.CompletionRNContainer",
				() => {
					const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
					const turePath = path.join(ROOT_PATH, '/storybook/stories/navigationbar/index.js')
					const currentPath = uri.fsPath
					vscodeInsertText(x => GET_RN_CONTAINER_TEXT(path.relative(currentPath, turePath)));
				}
			)
		)
	}
}