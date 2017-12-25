<br>

<p align="center">
<img src="http://www.pty.ink/varal-400.png" alt="Logo">
</p>

# Varal

Laravel 风格，轻量级，使用 ES6 特性编写的，面向对象的 Web 服务框架
欢迎 PR

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/varal.svg
[npm-url]: https://npmjs.org/package/varal

## Features

* 路由与路由组
* 中间件
* 控制器
* 模板引擎 `Handlebars`
* IoC 与 DI 的设计模式

## Log

* 0.4.10: 完成基本功能
* 0.5.0: 完善扩展模块的载入；增加简单的 `MySql` 扩展，支持链式查询

## Todo

* 完善 QueryBuilder，支持更复杂的查询语句，增加对 `PgSql` 的支持
* 增加 ORM 模块

## Installation

```bash
$ npm install varal --save
```

## Basic Usage

```javascript
const varal = require('varal');
const server = new varal();
server.get('/', app => {
    app.text('Hello World');
});
server.run();
```
运行文件，访问 `localhost:8888` 即可看到文本输出。

## Document

[Varal - 中文文档](http://d.varal.pty.ink)