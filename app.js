const express = require('express');
const moment = require('moment');
const { spawn } = require('child_process')

const app = express();

const allProcesses = {};
const processes = {};

function createProcess() {
    const logs = []; // Array to store time logs for process

    const process = spawn('node', ['-e', `
        setInterval(() => {
            console.log('hello');
            process.send('hello'); // Send logs to parent process
        }, 5000);
    `], { stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

    processes[process.pid] = process;

    // Object for storing proccess information and logs
    allProcesses[process.pid] = {
        pid: process.pid,
        creationTime: moment(new Date()).format('h:mm:ss a, D.MM.YYYY'),
        logs: logs
    };

    console.log(`Process created with PID: ${process.pid}, at: ${moment(new Date()).format('h:mm:ss a, D.MM.YYYY')}`);

    process.stdout.on('data', () => {
        logs.push(moment(new Date()).format('h:mm:ss a, D.MM.YYYY')); // push time logs to the logs array
    });

    process.on('exit', () => {
        delete allProcesses[process.pid];
        delete processes[process.pid];
        console.log(`${process.pid} the process has been successfully deleted`);
    });

    return allProcesses[process.pid]
}

app.post('/create-process', (req, res) => {
    try {
        const createdProcess = createProcess();
        const {logs, ...rest} = createdProcess
        res.status(200).json(rest);
    }
    catch {
        res.status(404).json({ message: 'Process not created.' })
    }
});

app.get('/get-all', (req, res) => {
    try {
        const processInfoArray = [];
        for (const pid in allProcesses) {
            if (allProcesses.hasOwnProperty(pid)) {
                const { pid: processPid, creationTime } = allProcesses[pid];
                processInfoArray.push({ pid: processPid, creationTime: creationTime });
            }
        }
        res.status(200).json(processInfoArray);
    } catch (error) {
        res.status(404).json({ message: 'No process found.', error: error.message });
    }
});

app.get('/get-single/:id', (req, res) => {
    try {
        const { id } = req.params;
        res.status(200).json({logs : allProcesses[id].logs })
    }
    catch {
        res.status(404).json({ message: 'Process not found.' })
    }
});

app.delete('/delete-process/:id', (req, res) => {
    try {
        const { id } = req.params;
        if(Object.keys(processes).includes(id)) {
            processes[id].kill();
            res.status(200).send(`The process with PID: '${id}' has been successfully deleted`)
        }
    }
    catch {
        res.status(404).json({ message: 'Process not found.' })
    }
});

const port = 8000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

