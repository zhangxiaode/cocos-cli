const singletonInstances = new WeakMap<Function, unknown>();

export class Singleton<T> {
    protected constructor() {}

    public static getInstance(this: any): any {
        if (!singletonInstances.has(this)) {
            singletonInstances.set(this, new this());
        }
        return singletonInstances.get(this);
    }

    public static destroyInstance(this: any): void {
        singletonInstances.delete(this);
    }
}