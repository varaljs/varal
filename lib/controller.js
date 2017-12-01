class Controller {

    static injector(ctn) {
        return [
            ctn.make('varal.app')
        ];
    }

    constructor(app) {
        this.app = app;
    }

}

exports = module.exports = Controller;