declare interface Command {
    command: string;
    callback: (...args: any[]) => any;
}

declare interface Heading {
    level: number;
    title: string;
}
