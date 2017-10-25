# Varal
轻量级的，易用的 Web 框架

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/varal.svg
[npm-url]: https://npmjs.org/package/varal

## Features

* Simple Route
* Controller
* Template Engine `Handlebars`
  
## Todo

* Route Group
* Middleware
* Model and ORM
* Error Handler

## Installation
```bash
$ npm install varal --save
```

## Quick Start
以下代码运行后访问 `localhost:8888` 即可看到输出：
```javascript
let server = require('varal').createNew();
server.get('/', function (app) {
    app.text('Hello World!');
});
server.run();
```
可以向 `createNew` 方法传入一个配置对象：
```javascript
let server = require('varal').createNew({
    port: 80,
    controller_path: 'YourControllerPath', // 默认值为 controller
    view_path: 'YourViewPath', // 默认值为 view
    static_paths: ['path1', 'path2'] // 默认值为 ['public']
});
```
#### 多服务：
```javascript
let server1 = require('varal').createNew({
    name: 'Server 1',
    port: 80
});
let server2 = require('varal').createNew({
    name: 'Server 2',
    port: 8080
});
server1.get('/', function (app) {
    app.text('This is Server 1');
});
server2.get('/', function (app) {
    app.text('This is Server 2');
});
server1.run();
server2.run();
```
#### 使用控制器：
```javascript
let server = require('varal').createNew();
server.get('/', 'HomeController@index');
server.run();
```
如果使用默认配置，框架将会寻找运行目录 `controller` 文件夹下的 `HomeController.js` 文件，这个文件需要返回一个拥有 `index` 方法的对象：
```javascript
module.exports = {
    index: function (app) {
        app.text('Test');
    }
};
```
#### 使用模板引擎：
`Varal` 目前仅支持 `Handlebars`，默认配置下视图文件需要放在运行目录的 `view` 文件夹下。例如 `view/test.hbs`：
```html
<h1>{{title}}</h1>
<p>{{body}}</p>
```
路由：
```javascript
server.get('/', function (app) {
    app.render('test', {
        title: 'Hello ',
        body: 'World!'
    })
});
```