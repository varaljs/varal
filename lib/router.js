'use strict';

let helper = require('./helper');

let Router = {
    createNew: function () {
        let router = {};
        router.index = 0;
        router.defaultGroup = createGroup();

        router.getCallback = function (method, path, group, prefix, middleware) {
            group = group || router.defaultGroup;
            if (prefix)
                prefix += helper.pathFormat(group.prefix);
            else
                prefix = helper.pathFormat(group.prefix);
            middleware = middleware || [];
            let i, value, callback, args;
            let path_match = false;
            let method_match = true;
            for (i = 0; i < group.routesMap.length; i += 1) {
                value = group.routesMap[i];
                if (args = helper.pathMatch(prefix + helper.pathFormat(value.path), helper.pathFormat(path))) {
                    path_match = true;
                    if (value.method === method) {
                        method_match = true;
                        callback = value.callback;
                        helper.array_merge(middleware, value.middleware);
                        break;
                    } else {
                        method_match = false;
                    }
                }
            }
            let this_result = {
                prefix: prefix,
                path_match: path_match,
                method_match: method_match,
                args: args,
                callback: callback,
                middleware: middleware
            };
            if (path_match === true && method_match === true)
                return this_result;
            group.groupsMap.sort(helper.compareWeight);
            for (i = 0; i < group.groupsMap.length; i += 1) {
                let child = group.groupsMap[i];
                helper.array_merge(middleware, child.middleware);
                let child_result = router.getCallback(method, path, child, prefix, middleware);
                if (child_result.path_match === true) {
                    if (child_result.method_match === true)
                        return child_result;
                    else
                        this_result = child_result;
                }
            }
            return this_result;
        };

        function createGroup(options) {
            options = options || {};
            let group = {
                index: router.index,
                weight: options.weight || 100,
                prefix: options.prefix || '',
                middleware: options.middleware || [],
                routesMap: [],
                groupsMap: []
            };
            router.index += 1;
            group.add = function (method, path, callback) {
                for (let i = 0; i < group.routesMap.length; i += 1) {
                    if (group.routesMap[i].path === path) {
                        group.routesMap.splice(i, 1);
                    }
                }
                let route = {
                    method: method,
                    path: path,
                    callback: callback,
                    middleware: [],
                    name: function (name) {
                        route.name = name;
                        return route;
                    },
                    use: function (middleware) {
                        route.middleware = middleware || [];
                        return route;
                    }
                };
                group.routesMap.push(route);
                return route;
            };
            group.get = function (path, callback) {
                return group.add('GET', path, callback);
            };
            group.post = function (path, callback) {
                return group.add('POST', path, callback);
            };
            group.group = function (options, callback) {
                if (typeof options === "function") {
                    callback = options;
                    options = {};
                }
                let child = createGroup(options);
                callback(child);
                group.groupsMap.push(child);
            };
            return group;
        }

        return router;
    }
};

exports = module.exports = Router;