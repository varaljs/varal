'use strict';

class Container {

    constructor() {
        this.binds = [];
        this.instances = [];
    }

    bind(abstract, concrete) {
        if (typeof concrete === 'function')
            this.binds[abstract] = concrete;
    }

    singleton(abstract, instance) {
        this.instances[abstract] = instance;
    }

    make(abstract, ...args) {
        if (typeof abstract === 'string') {
            if (this.instances[abstract])
                return this.instances[abstract];
            if (this.binds[abstract])
                return this.binds[abstract](this, ...args);
        }
        return makeClass(this, abstract, ...args);

    }

    static make(abstract, ...args) {
        return makeClass(this, abstract, ...args);
    }

}

const makeClass = (ctn, abstract, ...args) => {
    if (typeof abstract.injector === 'function' && typeof abstract.constructor === 'function') {
        const dependencies = abstract.injector(ctn);
        return new abstract(...dependencies, ...args);
    }
};

exports = module.exports = Container;