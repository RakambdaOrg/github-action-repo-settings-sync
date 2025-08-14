export class Cache {
    private readonly cache: Map<string, any> = new Map();

    public get<T>(key: string): T | undefined {
        return this.cache.get(key);
    }

    public set(key: string, value: any): void {
        this.cache.set(key, value);
    }
}
