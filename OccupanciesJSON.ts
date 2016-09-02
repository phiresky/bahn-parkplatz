// generated using /home/tehdog/data/dev/2016/bahn-parkplatz/createTSfromJSON.js
export interface OccupanciesJSON {
    allocations: OccupancyJSON[]
}

export interface OccupancyJSON {
    site: {
        id: number,
        siteId: number,
        flaechenNummer: number,
        stationName: string,
        siteName: string,
        displayName: string
    },
    allocation: {
        validData: boolean,
        timestamp: string,
        timeSegment: string,
        category: number,
        text: string
    }
}