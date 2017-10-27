# Varal
轻量级，易用的 Web 框架

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/varal.svg
[npm-url]: https://npmjs.org/package/varal

## Features 特性

* Simple Route and RouteGroup
* Controller
* Middleware
* Template Engine `Handlebars`
  
## Todo 待开发

* Error Handler
* Support files upload

## Installation 安装
```bash
$ npm install varal --save
```

## Basic Usage 基础用法

#### 基本使用
```javascript
let server = require('varal').createNew({
    port: 80 // 默认值为 8888
});
server.get('/', function (app) {
    app.text('Hello World');
})
```
访问 localhost 即可看到文本的输出。

#### 使用控制器

```javascript
let server = require('varal').createNew({
    port: 80, // 默认值为 8888
    controllerPath: 'YourPath' // 默认值为 'controller'
});
server.get('/', 'HomeController@index');
```
`(程序运行目录)/YourPath/HomeController.js`：
```javascript
exports = module.exports = {
    index: function (app) {
        app.text('From Controller');
    }
}
```
此例中，控制器文件需要以 `Node Module` 的方式返回带有 `index` 方法的对象。

#### 使用视图/模板引擎
```javascript
let server = require('varal').createNew({
    port: 80, // 默认值为 8888
    viewPath: 'YourPath' // 默认值为 'view'
});
server.get('/', function (app) {
    app.render('test', {
        'title': 'Hi!',
        'body': 'This page is rendered by handlebars'
    });
})
```
`(程序运行目录)/YourPath/test.hbs`：
```html
<h1>{{title}}</h1>
<p>{{body}}</p>
```

## Document 文档
暂无