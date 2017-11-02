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

### 服务实例 API
框架模组输出的对象只包含了一个伪构造函数 `createNew`，服务实例使用这个方法创建，只有一个可选参数，用于传入配置信息。
**你可以创建多个端口不同的实例并同时运行**

#### 方法
* run()：运行服务
* get(path, callback)：创建一个接收 `GET` 请求的路由，可以链式调用 `name` 方法来命名，以及 `use` 方法来加载中间件
* post(path, callback)：创建一个接收 `POST` 请求的路由，可以链式调用 `name` 方法来命名，以及 `use` 方法来加载中间件
* group([options, ]callback)：创建一个路由组，第一个为可选参数，传入配置选项
* add(name, callback)：定义一个中间件，第一个参数为命名，用于绑定在路由或者路由组上
* use(middleware)：加载全局中间件，参数类型为数组

#### 可以重新定义的方法
* error：Node发生错误时的处理函数
```javascript
server.error = function (err, app) {
    // Do something
};
```
* e404：找不到匹配的路由或静态文件时调用
* e405：查询路由时路径匹配但没有匹配的请求方法时调用
```javascript
server.e404 = function(app) {
    // Do something
};
server.e405 = function(app) {
    // Do something
};
```

### 请求实例 API
每当请求发生时，都会实例化一个 `app` 对象，它提供的属性和方法可以对该请求进行处理，它经常作为参数出现在本框架的回调中，如 `路由` 与 `中间件`

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
