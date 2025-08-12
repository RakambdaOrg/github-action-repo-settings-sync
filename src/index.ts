import * as core from '@actions/core';
import { Main } from './main';

new Main().run().catch((err: any) => {
    core.setFailed(err.message);
    core.debug(err);
});
