var Router = {
    createNew: function (app) {
        var router = {};
        router.get = function (path, callback) {
            for (var i = 0; i < app.routes_map.length; i += 1) {
                if (app.routes_map[i].path === path) {
                    app.routes_map.splice(i, 1);
                }
            }
            app.routes_map.push({
                method: 'get',
                path: path,
                callback: callback
            })
        };
        return router;
    }
};

exports = module.exports = Router;