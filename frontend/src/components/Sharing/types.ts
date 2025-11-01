export enum FileDirection {
    UP = "up",
    DOWN = "down",
}

export interface FileDisplay {
    name: string;
    direction: FileDirection;
    progress: number;
    size: number;
    time: Date;
}
