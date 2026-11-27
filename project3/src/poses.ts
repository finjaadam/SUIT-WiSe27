import {DOWN, FORWARD, LEFT, RIGHT, UP, sum, type Pose} from './poseMatch';

const LEGS_DOWN = {leftThigh: DOWN, leftShin: DOWN, rightThigh: DOWN, rightShin: DOWN};

export const POSES: Pose[] = [
    {name: 'Arme über dem Kopf', image: 'img/poses/arme-ueber-dem-kopf.svg', bones: {
        leftUpperArm: sum(UP, LEFT), leftForearm: sum(UP, RIGHT),
        rightUpperArm: sum(UP, RIGHT), rightForearm: sum(UP, LEFT),
        ...LEGS_DOWN,
    }},
    {name: 'Stern', image: 'img/poses/stern.svg', bones: {
        leftUpperArm: sum(UP, LEFT), leftForearm: sum(UP, LEFT),
        rightUpperArm: sum(UP, RIGHT), rightForearm: sum(UP, RIGHT),
        leftThigh: sum(DOWN, DOWN, LEFT), leftShin: sum(DOWN, DOWN, LEFT),
        rightThigh: sum(DOWN, DOWN, RIGHT), rightShin: sum(DOWN, DOWN, RIGHT),
    }},
    {name: 'Diagonale', image: 'img/poses/diagonale.svg', bones: {
        leftUpperArm: sum(UP, LEFT), leftForearm: sum(UP, LEFT),
        rightUpperArm: sum(DOWN, RIGHT), rightForearm: sum(DOWN, RIGHT),
        ...LEGS_DOWN,
    }},
    {name: 'Arme angewinkelt auf einem Bein', image: 'img/poses/arme-angewinkelt-auf-einem-bein.svg', oneLeg: true, bones: {
        leftUpperArm: DOWN, leftForearm: sum(RIGHT, RIGHT, RIGHT, UP, FORWARD, FORWARD),
        rightUpperArm: DOWN, rightForearm: sum(LEFT, LEFT, LEFT, UP, FORWARD, FORWARD),
    }},
];
