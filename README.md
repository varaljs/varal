# Varal
Laravel 风格，轻量级的 Web 框架

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

## Document 文档

### 基本使用
```javascript
let server = require('varal').createNew();
server.get('/', function (app) {
    app.text('Hello World');
});
```
访问 `localhost:8888` 即可看到文本的输出。

### 配置

```javascript
let server = require('varal').createNew({
    port: 80, // 默认值为 8888
    viewPath: 'YourViewPath', // 默认值为 'view'
    controllerPath: 'YourControllerPath', // 默认值为 'controller'
    staticPath: 'YourPublicPath' // 默认值为 'public'
});
```

* port：监听端口
* viewPath：视图文件目录，例如入口文件为 `/www/index.js`，默认目录则是 `/www/view/`，下同
* controllerPath：控制器目录
* staticPath：静态资源目录

### 路由

直接调用组件的 `get` 与 `post` 方法即可创建路由
```javascript
server.get('/', function (app) {
    app.text('Hello World');
}).name('index');
```
链式调用 `name` 方法为路由命名

#### 带有参数的路由

```javascript
server.get('/user/{id}/info', function (app, id) {
    app.text('User\'s ID is ' + id);
});
```

#### 获取请求数据

```javascript
server.post('/login', function (app) {
    app.text('Username : ' + app.fields.name);
});
```
请求中的 `URL参数` 与 `表单数据` 都会存放在回调第一个参数的 `fields` 属性中

#### 路由组

```javascript
server.group({prefix: 'group'}, function(group) {
    group.get('/a', function(app) {
        // Do something
    });
    group.group({prefix: 'b', middleware: ['auth', 'api']}, function(group) {
        group.get('/c', function(app) {
            //Do something
        });
    });
});
```
`group` 方法可以传入一个回调函数，函数中可以定义路由，当传入两个参数时，第一个参数为一个配置对象：

* prefix：路由前缀。上面代码中的两个路由路径分别是 `/group/a` 和 `/group/b/c`
* middleware：中间件数组
* weight：权重，默认100，值低的优先匹配

### 中间件(拦截器)

#### 定义中间件：
```javascript
server.add('auth', function(app, next) {
    let username = app.fields.username;
    let password = app.fields.password;
    // Do auth
    next();
});
```
`add` 函数可以定义中间件，传入两到三个参数，第一个参数为 `中间件命名`，第二个参数为 `回调句柄`，第三个参数为 `权重`，默认100，值低的优先运行，与定义顺序无关
`next` 方法用于将请求传递给下一个中间件或路由，不执行此方法响应将会提前结束

#### 加载全局中间件
```javascript
server.use(['auth', 'api']);
```

#### 为 `路由` 附加中间件
```javascript
server.get('/', function(app) {
    // Do something
}).use(['auth']);
```

#### 为 `路由组` 附加中间件
```javascript
server.group({middleware: ['auth']}, function(group) {
    // Some route
});
```

### 使用控制器

```javascript
server.get('/', 'HomeController@index');
```
`controller/HomeController.js`：
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
server.get('/', function (app) {
    app.render('test', {
        'title': 'Hi!',
        'body': 'This page is rendered by handlebars'
    });
})
```
`view/test.hbs`：
```html
<h1>{{title}}</h1>
<p>{{body}}</p>
```

### 请求单例 `app`

在 `路由` 与 `中间件` 的回调中，都会传入一个 `app` 参数，每个请求对应一个 `app` 实例。

#### 属性
* req：`request` 对象
* res：`response` 对象
* resIsEnd：响应是否已经结束
* resEndWith：响应处理方式，可能值为 `null`，`route`，`static`
* path：请求路径
* fields：请求中的参数，包括 `URL` 参数、`application/x-www-form-urlencoded` 表单参数以及 `form-data` 单表参数
* contentType：`content-type`

#### 方法
* text(string)：返回状态码 `200` 并输出文本
* json(object)：返回状态码 `200` 并输出Json，参数需要传入一个对象
* render(view, object)：返回状态码 `200` 并使用视图模板输出 `HTML`
* route(name)：跳转至命名为 `name` 的路由处理
* resEnd()：手动终止响应，这之后将无视上述三个方法，但使用 `response` 对象写入请求仍可能报错
