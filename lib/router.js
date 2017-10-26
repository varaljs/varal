'use strict';

let Router = {
    createNew: function () {
        let router = {};
        router.index = 0;
        router.defaultGroup = createGroup();

        router.getCallback = function (method, path, group) {
            group = group || router.defaultGroup;
            let i, value, callback;
            let path_match = false;
            let method_match = true;
            for (i = 0; i < group.routesMap.length; i += 1) {
                value = group.routesMap[i];
                if (value.path === path) {
                    path_match = true;
                    if (value.method === method) {
                        method_match = true;
                        callback = value.callback;
                        break;
                    } else {
                        method_match = false;
                    }
                }
            }
            let this_result = {
                path_match: path_match,
                method_match: method_match,
                callback: callback
            };
            if (path_match === true && method_match === true)
                return this_result;
            for (i = 0; i < group.groupsMap.length; i += 1) {
                let child = group.groupsMap[i];
                let child_result = router.getCallback(method, path, child);
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
                group.routesMap.push({
                    method: method,
                    path: path,
                    callback: callback
                })
                // TODO : 链式添加 middleware
            };
            group.get = function (path, callback) {
                group.add('GET', path, callback);
            };
            group.post = function (path, callback) {
                group.add('POST', path, callback);
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