"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scorers_1 = require("@double-agent/analyze/lib/scorers");
const matchers_1 = require("@double-agent/analyze/lib/matchers");
const Plugin_1 = require("@double-agent/analyze/lib/Plugin");
const CheckGenerator_1 = require("./lib/CheckGenerator");
class HttpBasicHeaders extends Plugin_1.default {
    initialize(profiles) {
        const checks = [];
        for (const profile of profiles) {
            const checkGenerator = new CheckGenerator_1.default(profile);
            checks.push(...checkGenerator.checks);
        }
        this.initializeProbes({
            layerKey: 'BAH',
            layerName: 'Basic Headers',
            // description: 'Compares header order, capitalization and default values to normal (recorded) user agent values',
            checks,
            matcher: matchers_1.PositiveMatcher,
            scorer: scorers_1.DiffGradient,
        });
    }
    runIndividual(profile) {
        const checkGenerator = new CheckGenerator_1.default(profile);
        return this.runProbes('BAH', profile.userAgentId, checkGenerator.checks);
    }
}
exports.default = HttpBasicHeaders;
//# sourceMappingURL=index.js.map