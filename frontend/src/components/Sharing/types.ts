export enum FileDirection {
    UP = "up",
    DOWN = "down",
}

export interface FileDisplay {
    name: string;
    direction: FileDirection;
    size: number;
    time: Date;
}
