import { Observer } from "./Observer";

export interface IObservable<T> {
    subscribe(observer: Observer<T>): void;
    unsubscribe(observer: Observer<T>): void;
    notify(data: T): void;
}

export interface IObservableOnce<T> {
    subscribeOnce(observer: Observer<T>): void;
}

export class Observable<T> implements IObservable<T>, IObservableOnce<T> {
    private observers: Observer<T>[] = [];

    public subscribe(observer: Observer<T>): void {
        this.observers.push(observer);
    }

    public unsubscribe(observer: Observer<T>): void {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    public notify(data: T): void {
        this.observers.forEach(observer => observer(data));
    }

    public subscribeOnce(observer: Observer<T>): void {
        const wrapper = (data: T) => {
            observer(data);
            this.unsubscribe(wrapper);
        };
        this.subscribe(wrapper);
    }
}
