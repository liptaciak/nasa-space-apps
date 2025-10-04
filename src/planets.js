export class Planet {
    /**
     * @param {string} name
     * @param {number} radius
     * @param {number} distanceFromSun
     * @param {object} orbitParams - { eccentricity, inclination, period, longitudeOfAscendingNode, argumentOfPeriapsis, meanAnomalyAtEpoch }
     */
    constructor(name, radius, distanceFromSun, orbitParams = {}) {
        this.name = name;
        this.radius = radius;
        this.distanceFromSun = distanceFromSun;
        this.eccentricity = orbitParams.eccentricity ?? 0;
        this.inclination = orbitParams.inclination ?? 0;
        this.period = orbitParams.period ?? 1;
        this.longitudeOfAscendingNode = orbitParams.longitudeOfAscendingNode ?? 0;
        this.argumentOfPeriapsis = orbitParams.argumentOfPeriapsis ?? 0;
        this.meanAnomalyAtEpoch = orbitParams.meanAnomalyAtEpoch ?? 0;
    }
}