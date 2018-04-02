const helper = require('./helper');

class Router {

    constructor() {
        this.defaultGroup = new Group();
    }

    getCallback(method, path, group, prefix, middleware) {
        group = group || this.defaultGroup;
        prefix = prefix || '';
        prefix += group.prefix;
        middleware = middleware || [];
        let this_result = getResultFromRoutesMap(group.routesMap, prefix, path, method, middleware);
        if (this_result.path_match === true && this_result.method_match === true)
            return this_result;
        group.groupsMap.sort(helper.comparePriority);
        for (let i = 0; i < group.groupsMap.length; i += 1) {
            const child = group.groupsMap[i];
            const child_result = this.getCallback(method, path, child, prefix, middleware);
            if (child_result.path_match === true)
                if (child_result.method_match === true) {
                    helper.arrayMerge(middleware, child.middleware);
                    return child_result;
                } else
                    this_result = child_result;
        }
        return this_result;
    }

    getCallbackByName(name, group) {
        group = group || this.defaultGroup;
        let i;
        for (i = 0; i < group.routesMap.length; i += 1)
            if (group.routesMap[i]._name === name)
                return group.routesMap[i].callback;
        group.groupsMap.sort(helper.comparePriority);
        for (i = 0; i < group.groupsMap.length; i += 1) {
            const child = group.groupsMap[i];
            const child_result = this.getCallbackByName(name, child);
            if (child_result !== undefined)
                return child_result;
        }
    }

}

class Group {

    constructor(options) {
        this.priority = 100;
        this.middleware = [];
        Object.assign(this, options);
        this.prefix = helper.pathFormat(options ? options.prefix : '');
        this.routesMap = [];
        this.groupsMap = [];
    }

    add(method, path, callback) {
        path = helper.pathFormat(path);
        for (let i = 0; i < this.routesMap.length; i += 1)
            if (this.routesMap[i].method === method && this.routesMap[i].path === path)
                this.routesMap.splice(i, 1);
        const route = new Route(method, path, callback);
        this.routesMap.push(route);
        return route;
    }

    get(path, callback) {
        return this.add('GET', path, callback);
    }

    post(path, callback) {
        return this.add('POST', path, callback);
    }

    group(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const child = new Group(options);
        callback(child);
        this.groupsMap.push(child);
    }

}

class Route {

    constructor(method, path, callback) {
        this.method = method;
        this.path = path;
        this.callback = callback;
        this.middleware = [];
    }

    name(name) {
        this._name = name;
        return this;
    }

    use(middleware) {
        if (Array.isArray(middleware))
            this.middleware = helper.arrayMerge(this.middleware, middleware);
        else if (typeof middleware === 'string')
            this.middleware.push(middleware);
        return this;
    }

}

const getResultFromRoutesMap = (routesMap, prefix, path, method, middleware) => {
    let value, callback, args;
    let path_match = false;
    let method_match = true;
    for (let i = 0; i < routesMap.length; i += 1) {
        value = routesMap[i];
        args = helper.pathMatch(prefix + value.path, path);
        if (args) {
            path_match = true;
            if (value.method === 'ANY' || value.method === method) {
                method_match = true;
                callback = value.callback;
                helper.arrayMerge(middleware, value.middleware);
                break;
            } else
                method_match = false;
        }
    }
    return {prefix, path_match, method_match, args, callback, middleware};
};

exports = module.exports = Router;