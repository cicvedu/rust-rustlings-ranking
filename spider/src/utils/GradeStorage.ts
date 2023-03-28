import { readFile } from 'fs/promises';
import { ExpChain, chain } from 'lodash';

type StudentInfo = {
    name: string;
    avatar: string;
    repo_url: string;
    grades: Object[];
    details: string;
    timestamp: number;
};

type Data = {
    available: Object,
    students: StudentInfo[],
    questions: Object[],
    latestUpdatedAt: Number
};

let data: Data;

/**
 * initialize the database json file.
 */
export async function initDatabase() {
    data = JSON.parse((await readFile('../web/src/data.json')).toString('utf8'));
}

/**
 * update the grades of the students, refill the information about the student.
 * @param username username of the student
 * @param grades grades of the student
 */
export function updateGrades(username: string, grades: string[]) {
    
}

/**
 * get the information about the student.
 * @param username the username of the student
 */
export function getUserInfo(username: string) {
    return chain(data)
        .get('students')
        .find(user => user.name == username)
        .value();
}