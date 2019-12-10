



> le app plugin 是 app 项目辅助插件

- 相关功能
	- [路由管理]
		- 刷新路由管理器
		- [快捷键]编辑区域 -> [(cmd + l) + (cmd + o)] -> 搜索路由
		- [快捷键]编辑区域 -> [(cmd + l) + (cmd + 5)] -> 搜索文件路由来源
		- [菜单右键]编辑区域 -> 右键 -> 进入该文件调试模式
			- [快捷键]编辑区域 -> [(cmd + l) + (cmd + 0)] -> 进入上一级路由
			- [快捷键]编辑区域 -> [(cmd + l) + (cmd + 9)] -> 进入下一级路由

	- [文件管理]
		- [快捷键]编辑区域 -> [(cmd + l) + (cmd + 4)] -> 搜索文件所有依赖上游

	- [worktile]
		- 查询任务列表
		- 刷新任务列表
		- 追踪代码
		- 在 Worktile 中打开
		配置: 
		```
		.le_app_plugin
			worktile_config.js
			module.exports = {
				password: 'xxx',
				signin_name: 'sam.shan@letote.cn'
			}
		```

	- [Tracker]
		- 启动追踪服务器
		- 关闭追踪服务器



