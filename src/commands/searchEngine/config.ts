export interface SearchableCommand {
	id: string
	name: string
	tags: string[]
}
export const Commands: SearchableCommand[] = [
  {
    id: "LeAppPlugin.SearchRouter",
    name: "查看全部导航路由",
    tags: ['Navigation','如: 输入 Home']
	},
	{
		id: 'LeAppPlugin.SearchRouterByTag',
		name: "搜索导航路由",
		tags: ['Navigation','如: 输入 待付款']
	},
	{
		id: 'LeAppPlugin.showFileParentsInPick',
		name: '查看当前文件引用路径',
		tags: ['Import Relation']
	},
	{
		id: 'LeAppPlugin.getCurrentFileScreenContainer',
		name: '查看当前文件路由容器',
		tags: [
			'Navigation'
		]
	},
	{
		id: 'LeAppPlugin.showNavigatorFromList',
		name: '查看当前文件路由来源',
		tags: [
			'Navigation From'
		]
	},
	{
		id: 'LeAppPlugin.refreshRouterManager',
		name: '刷新文件分析缓存',
		tags: [
			'重新分析文件信息，以正确更新其他命令的搜索结果'
		]
	},
	{
		id: 'LeAppPlugin.startTrackCodeServer',
		name: '打开代码追踪器',
		tags: [
			'开发时通过UI快速定位文件位置'
		]
	},
	{
		id: 'LeAppPlugin.StartLeReactCoder',
		name: '打开辅助编码器',
		tags: [
			'获得设计稿后，把index.html拖入编辑器后，打开辅助编码器快速编程'
		]
	},
	{
		id: 'LeAppPlugin.openExternalAdmin',
		name: '打开项目管理后台',
		tags: [
			'ABTest查询',
			'图标资源查询',
			'需要sam启动该服务'
		],
	},
	{
		id: 'LeAppPlugin.checkHelp',
		name: '查看其他全部命令说明',
		tags: []
	},
	
];

export const HelpCommands: SearchableCommand[] = [
	{
    id: "LeAppPlugin.refreshWorkTileTasks",
    name: "刷新worktile任务列表",
    tags: ['插件菜单中', '[Pending]可用来追踪代码']
	},
	{
		id: 'LeAppPlugin.closeTrackCodeServer',
		name: "关闭代码追踪器",
		tags: []
	},
	{
		id: 'LeAppPlugin.closeLeCoderServer',
		name: "关闭辅助编码器",
		tags: []
	}
]