import { createInterface } from "readline";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { table } from "table";

type Assignment = { "name": string, "date": number, "description": string, "completed"?: number };
enum Stage {
    Home,
    Completed,
    MarkDone,
    NewNameDate,
    NewDescription
}

const assignments: Assignment[] = [ ];
if (existsSync("todo.json")) JSON.parse(readFileSync("todo.json").toString()).forEach((v: Assignment) => assignments.push(v));

let stage: Stage = Stage.Home;

function sort(assignments: Assignment[]) {
    return [ ... assignments ].sort((a, b) => a.date - b.date);
}

function refresh(extra: String = "") {
    process.stdout.write(`\x1Bc${extra != "" ? extra + "\n" : ""}`);
    if (stage == Stage.Home) {
        const list: string[][] = [ [ "Name", "Due", "Description" ] ];
        for (const as of sort(assignments)) {
            if (as.completed) continue;
        
            const time = as.date - Date.now();
            const count = Math.ceil(Math.abs(time) / 1000 / 60 / 60 / 24);

            if (time < 0) {
                list.push([ as.name, Math.floor(Math.abs(time) / 1000 / 60 / 60 / 24) == 0 ? "Today" : `${count} DAY${count != 1 ? "S" : ""} OVERDUE`, as.description ]);
            }
            else {
                list.push([ as.name, `In ${count} day${count != 1 ? "s" : ""}`, as.description ]);
            }
        }
        console.log(table(list, { "columns": [ { "wrapWord": true, "width": 15 }, { "wrapWord": true, "width": 12 }, { "wrapWord": true, "width": 110 } ] }));
        console.log("1) Mark an assignment as done.");
        console.log("2) Add a new assignment.");
        console.log("3) List completed assignments.");
    }
    else if (stage == Stage.MarkDone) {
        const list: string[][] = [ [ "Name", "Description" ] ];
        for (const as of sort(assignments)) {
            if (as.completed) continue;

            list.push([ as.name, as.description ]);
        }
        console.log(table(list, { "columns": [ { "wrapWord": true, "width": 15 }, { "wrapWord": true, "width": 110 } ] }));
        console.log("Select an assignment's name to mark as done or enter to return.");
    }
    else if (stage == Stage.Completed) {
        const list: string[][] = [ [ "Due", "Done", "Name", "Description" ] ];
        for (const as of assignments) {
            if (!as.completed) continue
            
            const time = as.date - Date.now();
            const completedDay = Math.floor(Math.abs(Date.now() - as.completed) / 1000 / 60 / 60 / 24);
            const completed = `${completedDay} day${completedDay != 1 ? "s" : ""} ago`;
            const day = Math.ceil(Math.abs(time) / 1000 / 60 / 60 / 24);

            if (time < 0) {
                list.push([ `${day} day${day != 1 ? "s" : ""} ago`, completed, as.name, as.description ]);
            }
            else {
                list.push([ `In ${day} day${day != 1 ? "s" : ""}`, completed, as.name, as.description ]);
            }
        }
        console.log(table(list, { "columns": [ { "wrapWord": true, "width": 12 }, { "wrapWord": true, "width": 12 }, { "wrapWord": true, "width": 15 }, { "wrapWord": true, "width": 90 } ] }));
        console.log("Press enter to return.");
    }
    else if (stage == Stage.NewNameDate) {
        console.log("Enter the assignment's name followed by its date (mm/dd)");
    }
    else if (stage == Stage.NewDescription) {
        console.log("Enter the assignment's description");
    }
}

refresh();

let currentName: string = "", currentDate: number = 0;

const rl = createInterface(process.stdin);
rl.on("line", l => {
    l = l.trim();
    if (stage == Stage.Home) {
        if (l == "1") stage = Stage.MarkDone;
        else if (l == "2") {
            stage = Stage.NewNameDate;
            currentName = "";
            currentDate = 0;
        }
        else if (l == "3") stage = Stage.Completed;
        else {
            refresh("Unknown option! Type '1', '2', or '3'");
            return;
        }

        refresh();
        return;
    }
    else if (stage == Stage.MarkDone) {
        if (l == "") {
            stage = Stage.Home;
            refresh();
            return;
        }

        const a = assignments.find(a => !a.completed && a.name == l);
        if (a) {
            a.completed = Date.now();
            refresh("Assignment marked as done.");
        }
        else refresh("Assignment not found.");
    }
    else if (stage == Stage.Completed) {
        stage = Stage.Home;
        refresh();
    }
    else if (stage == Stage.NewNameDate) {
        if (l.length == 0 || l.split(" ").length == 1) {
            refresh("That can't be used as a name!");
            return;
        }
        const name = l.split(" ").slice(0, -1).join(" ");

        if (assignments.find(a => !a.completed && a.name == name)) {
            refresh("That name is already taken!");
            return;
        }

        const date = l.split(" ").reverse()[0];
        const sp = date.split("/");
        if (sp.length != 2 || sp.find(s => isNaN(parseInt(s))) ||
                parseInt(sp[0]) < 1 || parseInt(sp[0]) > 12 ||
                parseInt(sp[1]) < 1 || parseInt(sp[1]) > 31) {
            refresh("That isn't a valid date (mm/dd)!");
            return;
        }
        
        const [ mm, dd ] = sp.map(s => parseInt(s));
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        if (d.getMonth() > mm) d.setFullYear(d.getFullYear() + 1);
        d.setMonth(mm - 1, dd);

        currentDate = d.getTime();
        currentName = name;

        stage = Stage.NewDescription;
        refresh();
    }
    else if (stage == Stage.NewDescription) {
        assignments.push({ "name": currentName, "date": currentDate, "description": l });
        stage = Stage.Home;
        refresh("Assignment registered!");
    }

    writeFileSync("todo.json", JSON.stringify(assignments));
});

setInterval(() => refresh(), 15 * 60 * 1000);