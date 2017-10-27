let Helper = {
    pathFormat: function (path) {
        if (path === '/')
            return path;
        if (path.substr(0, 1) !== '/')
            path = '/' + path;
        if (path.substr(-1, 1) === '/')
            path = path.substr(0, path.length - 1);
        return path;
    },
    compareWeight: function (a, b) {
        if (a.weight < b.weight) {
            return -1;
        } else if (a.weight > b.weight) {
            return 1;
        } else {
            return 0;
        }
    },
    array_merge: function (a, b) {
        for (let i = 0; i < b.length; i += 1)
            if (a.indexOf(b[i]) < 0)
                a.push(b[i]);
        return a;
    }
};

exports = module.exports = Helper;