/* =========================================================
   QUẢN LÝ LỚP HỌC
   Kết nối Google Sheets
========================================================= */


/* =========================================================
   CẤU HÌNH GOOGLE SHEET
========================================================= */

const SHEET_ID =
    "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU";


const SHEETS = {

    LOP: "LOP",

    HOCSINH: "HOCSINH",

    DIEM: "DIEM",

    THIDUA: "THIDUA",

    DIEMDANH: "DIEMDANH"

};


/* =========================================================
   BIẾN DỮ LIỆU
========================================================= */

let DATA = {

    lop: [],

    hocSinh: [],

    diem: [],

    thiDua: [],

    diemDanh: []

};


let currentClass = "";


/* =========================================================
   GOOGLE SHEET GVIZ
========================================================= */

function sheetURL(sheetName) {

    return (
        "https://docs.google.com/spreadsheets/d/" +
        SHEET_ID +
        "/gviz/tq?" +
        "tqx=out:json" +
        "&sheet=" +
        encodeURIComponent(sheetName)
    );

}


/* =========================================================
   CHUYỂN GVIZ → ARRAY OBJECT
========================================================= */

async function getSheet(sheetName) {

    console.log(
        "Đang tải sheet:",
        sheetName
    );

    const response =
        await fetch(
            sheetURL(sheetName)
        );

    if (!response.ok) {

        throw new Error(
            "Không thể tải sheet " +
            sheetName +
            ". HTTP " +
            response.status
        );

    }


    const text =
        await response.text();


    /*
       GViz trả về:

       google.visualization.Query.setResponse(...)
    */


    const start =
        text.indexOf("{");

    const end =
        text.lastIndexOf("}");


    if (
        start === -1 ||
        end === -1
    ) {

        throw new Error(
            "Google Sheet không trả về dữ liệu hợp lệ: " +
            sheetName
        );

    }


    const json =
        JSON.parse(
            text.substring(
                start,
                end + 1
            )
        );


    if (
        !json.table ||
        !json.table.cols
    ) {

        return [];

    }


    const headers =
        json.table.cols.map(
            (col, index) => {

                let label =
                    col.label ||
                    col.id ||
                    ("col" + index);

                return normalize(
                    label
                );

            }
        );


    const rows =
        json.table.rows || [];


    return rows.map(
        row => {

            const obj = {};


            headers.forEach(
                (header, index) => {

                    const cell =
                        row.c &&
                        row.c[index];

                    obj[header] =
                        cell &&
                        cell.v !== null &&
                        cell.v !== undefined
                            ? cell.v
                            : "";

                }
            );


            return obj;

        }
    );

}


/* =========================================================
   CHUẨN HÓA TÊN CỘT
========================================================= */

function normalize(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /đ/g,
            "d"
        )
        .replace(
            /[^a-z0-9]+/g,
            ""
        );

}


/* =========================================================
   LẤY GIÁ TRỊ THEO NHIỀU TÊN CỘT
========================================================= */

function getValue(
    row,
    names
) {

    if (!row) return "";

    for (
        const name of names
    ) {

        const key =
            normalize(name);

        if (
            Object.prototype
                .hasOwnProperty
                .call(row, key)
        ) {

            return row[key];

        }

    }

    return "";

}


/* =========================================================
   CHUYỂN SANG SỐ
========================================================= */

function toNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    let number =
        parseFloat(
            String(value)
                .replace(",", ".")
        );


    return Number.isFinite(number)
        ? number
        : null;

}


/* =========================================================
   FORMAT NGÀY
========================================================= */

function formatDate(value) {

    if (!value) return "—";


    /*
       Nếu GViz trả Date(...)
    */

    let str =
        String(value);


    const match =
        str.match(
            /Date\((\d+),(\d+),(\d+)\)/
        );


    if (match) {

        const year =
            Number(match[1]);

        const month =
            Number(match[2]) + 1;

        const day =
            Number(match[3]);


        return (
            String(day).padStart(2, "0") +
            "/" +
            String(month).padStart(2, "0") +
            "/" +
            year
        );

    }


    /*
       Nếu là yyyy-mm-dd
    */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(str)
    ) {

        const parts =
            str.split("-");

        return (
            parts[2] +
            "/" +
            parts[1] +
            "/" +
            parts[0]
        );

    }


    return str;

}


/* =========================================================
   LẤY TÊN HỌC SINH
========================================================= */

function studentName(row) {

    return (
        getValue(
            row,
            [
                "Họ và tên",
                "Họ tên",
                "Tên học sinh",
                "Tên"
            ]
        ) ||
        "—"
    );

}


/* =========================================================
   LẤY MÃ HỌC SINH
========================================================= */

function studentCode(row) {

    return (
        getValue(
            row,
            [
                "Mã HS",
                "MA HS",
                "Mã học sinh",
                "MaHS"
            ]
        ) ||
        ""
    );

}


/* =========================================================
   LẤY LỚP
========================================================= */

function rowClass(row) {

    return (
        getValue(
            row,
            [
                "Lớp",
                "Tên lớp",
                "Lop",
                "Class"
            ]
        ) ||
        ""
    )
        .toString()
        .trim();

}


/* =========================================================
   LOAD TOÀN BỘ
========================================================= */

async function loadAllData() {

    showError("");

    console.clear();

    console.log(
        "========== BẮT ĐẦU TẢI DỮ LIỆU =========="
    );


    try {

        /*
           Tải song song
        */

        const [
            lop,
            hocSinh,
            diem,
            thiDua,
            diemDanh
        ] =
        await Promise.all([

            getSheet(
                SHEETS.LOP
            ),

            getSheet(
                SHEETS.HOCSINH
            ),

            getSheet(
                SHEETS.DIEM
            ),

            getSheet(
                SHEETS.THIDUA
            ),

            getSheet(
                SHEETS.DIEMDANH
            )

        ]);


        DATA.lop =
            lop || [];

        DATA.hocSinh =
            hocSinh || [];

        DATA.diem =
            diem || [];

        DATA.thiDua =
            thiDua || [];

        DATA.diemDanh =
            diemDanh || [];


        console.log(
            "Dữ liệu lớp:",
            DATA.lop
        );

        console.log(
            "Dữ liệu học sinh:",
            DATA.hocSinh
        );

        console.log(
            "Dữ liệu điểm:",
            DATA.diem
        );

        console.log(
            "Dữ liệu thi đua:",
            DATA.thiDua
        );

        console.log(
            "Dữ liệu điểm danh:",
            DATA.diemDanh
        );


        /*
           Hiển thị danh sách lớp
        */

        renderClasses();


        /*
           Nếu chưa có lớp được chọn
           chọn lớp đầu tiên
        */

        if (
            !currentClass &&
            DATA.lop.length
        ) {

            currentClass =
                getClassName(
                    DATA.lop[0]
                );

        }


        /*
           Nếu lớp không tồn tại
           chọn lớp đầu tiên
        */

        const classNames =
            getClassNames();


        if (
            !classNames.includes(
                currentClass
            )
        ) {

            currentClass =
                classNames[0] ||
                "";

        }


        setClassSelect();


        renderDashboard();


        console.log(
            "========== ĐÃ TẢI XONG =========="
        );

    }
    catch (error) {

        console.error(
            "LỖI:",
            error
        );


        showError(
            "Không thể tải dữ liệu Google Sheet: " +
            error.message
        );

    }

}


/* =========================================================
   LẤY TÊN LỚP TỪ ROW
========================================================= */

function getClassName(row) {

    let value =
        getValue(
            row,
            [
                "Tên lớp",
                "Lớp",
                "TênLớp",
                "Lop",
                "Class",
                "Mã lớp",
                "Ma lop"
            ]
        );


    return String(
        value || ""
    ).trim();

}


/* =========================================================
   DANH SÁCH LỚP
========================================================= */

function getClassNames() {

    const result = [];


    DATA.lop.forEach(
        row => {

            const name =
                getClassName(row);


            if (
                name &&
                !result.includes(name)
            ) {

                result.push(name);

            }

        }
    );


    /*
       Nếu sheet LOP không có
       tên lớp rõ ràng,
       tìm lớp trong HOCSINH
    */

    if (
        result.length === 0
    ) {

        DATA.hocSinh.forEach(
            row => {

                const name =
                    rowClass(row);


                if (
                    name &&
                    !result.includes(name)
                ) {

                    result.push(name);

                }

            }
        );

    }


    return result;

}


/* =========================================================
   HIỂN THỊ DROPDOWN LỚP
========================================================= */

function renderClasses() {

    const select =
        document.getElementById(
            "classSelect"
        );


    if (!select) return;


    const classes =
        getClassNames();


    select.innerHTML = "";


    if (
        classes.length === 0
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value = "";

        option.textContent =
            "Không có lớp";

        select.appendChild(
            option
        );

        return;

    }


    classes.forEach(
        className => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                className;

            option.textContent =
                className;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   SET LỚP HIỆN TẠI
========================================================= */

function setClassSelect() {

    const select =
        document.getElementById(
            "classSelect"
        );


    if (!select) return;


    select.value =
        currentClass;

}


/* =========================================================
   ĐỔI LỚP
========================================================= */

function changeClass() {

    const select =
        document.getElementById(
            "classSelect"
        );


    currentClass =
        select.value;


    renderDashboard();

}


/* =========================================================
   LỌC HỌC SINH THEO LỚP
========================================================= */

function getStudentsForClass() {

    /*
       Nếu HOCSINH có cột Lớp
       thì lọc theo lớp.

       Nếu không có cột lớp,
       dùng toàn bộ học sinh.
    */

    const hasClassColumn =
        DATA.hocSinh.some(
            row =>
                rowClass(row)
        );


    if (
        !hasClassColumn
    ) {

        return DATA.hocSinh;

    }


    return DATA.hocSinh.filter(
        row =>
            rowClass(row)
                .toLowerCase() ===
            currentClass
                .toLowerCase()
    );

}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard() {

    const students =
        getStudentsForClass();


    document.getElementById(
        "totalStudents"
    ).textContent =
        students.length;


    document.getElementById(
        "classDesc"
    ).textContent =
        "Lớp " +
        (
            currentClass ||
            "—"
        );


    document.getElementById(
        "studentCountTitle"
    ).textContent =
        students.length +
        " học sinh";


    document.getElementById(
        "teacherClass"
    ).textContent =
        "Lớp " +
        (
            currentClass ||
            "—"
        );


    renderStudents(
        students
    );


    renderScores(
        students
    );


    renderCompetition(
        students
    );


    renderAttendance(
        students
    );


    calculateStatistics(
        students
    );


    renderAttention(
        students
    );

}


/* =========================================================
   HIỂN THỊ HỌC SINH
========================================================= */

function renderStudents(
    students
) {

    const tbody =
        document.getElementById(
            "studentsTable"
        );


    tbody.innerHTML = "";


    if (
        students.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td colspan="6"
                    style="text-align:center;padding:25px;">
                    Không tìm thấy học sinh.
                </td>
            </tr>
            `;

        return;

    }


    students.forEach(
        (student, index) => {

            const code =
                studentCode(student);


            const name =
                studentName(student);


            const dob =
                getValue(
                    student,
                    [
                        "Ngày sinh",
                        "Ngay sinh",
                        "DOB"
                    ]
                );


            const gender =
                getValue(
                    student,
                    [
                        "Giới tính",
                        "Gioi tinh",
                        "GT"
                    ]
                );


            const note =
                getValue(
                    student,
                    [
                        "Ghi chú",
                        "Ghi chu",
                        "Chú thích"
                    ]
                );


            tbody.innerHTML +=
                `
                <tr>

                    <td>${index + 1}</td>

                    <td>
                        <b>${escapeHTML(code)}</b>
                    </td>

                    <td>
                        ${escapeHTML(name)}
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(dob)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            gender || "—"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            note || "—"
                        )}
                    </td>

                </tr>
                `;

        }
    );

}


/* =========================================================
   TÌM DÒNG ĐIỂM
========================================================= */

function findScoreRow(
    code
) {

    return DATA.diem.find(
        row =>
            studentCode(row)
                .toLowerCase() ===
            String(code)
                .toLowerCase()
    );

}


/* =========================================================
   HIỂN THỊ ĐIỂM
========================================================= */

function renderScores(
    students
) {

    const tbody =
        document.getElementById(
            "scoresTable"
        );


    tbody.innerHTML = "";


    if (
        students.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td colspan="8"
                    style="text-align:center;padding:25px;">
                    Không có dữ liệu điểm.
                </td>
            </tr>
            `;

        return;

    }


    students.forEach(
        (student, index) => {

            const code =
                studentCode(student);


            const score =
                findScoreRow(code);


            const tx1 =
                getScore(
                    score,
                    ["TX1", "Tx1", "T1"]
                );


            const tx2 =
                getScore(
                    score,
                    ["TX2", "Tx2", "T2"]
                );


            const tx3 =
                getScore(
                    score,
                    ["TX3", "Tx3", "T3"]
                );


            const tx4 =
                getScore(
                    score,
                    ["TX4", "Tx4", "T4"]
                );


            let avg =
                getScore(
                    score,
                    [
                        "Điểm TB",
                        "Diem TB",
                        "ĐTB",
                        "DTB",
                        "TB"
                    ]
                );


            /*
               Nếu sheet không có ĐTB,
               tự tính.
            */

            if (
                avg === "—" &&
                score
            ) {

                const numbers =
                    [
                        tx1,
                        tx2,
                        tx3,
                        tx4
                    ]
                        .map(
                            toNumber
                        )
                        .filter(
                            x =>
                                x !== null
                        );


                if (
                    numbers.length
                ) {

                    const sum =
                        numbers.reduce(
                            (a,b) =>
                                a + b,
                            0
                        );


                    avg =
                        (
                            sum /
                            numbers.length
                        ).toFixed(2);

                }

            }


            tbody.innerHTML +=
                `
                <tr>

                    <td>${index + 1}</td>

                    <td>
                        <b>${escapeHTML(code)}</b>
                    </td>

                    <td>
                        ${escapeHTML(
                            studentName(student)
                        )}
                    </td>

                    <td>${tx1}</td>

                    <td>${tx2}</td>

                    <td>${tx3}</td>

                    <td>${tx4}</td>

                    <td>
                        <b>${avg}</b>
                    </td>

                </tr>
                `;

        }
    );

}


/* =========================================================
   LẤY ĐIỂM
========================================================= */

function getScore(
    row,
    names
) {

    if (!row) return "—";


    const value =
        getValue(
            row,
            names
        );


    const number =
        toNumber(value);


    if (
        number === null
    ) {

        return "—";

    }


    return Number.isInteger(number)
        ? number
        : number.toFixed(2);

}


/* =========================================================
   THI ĐUA
========================================================= */

function renderCompetition(
    students
) {

    const tbody =
        document.getElementById(
            "competitionTable"
        );


    tbody.innerHTML = "";


    const codes =
        students.map(
            studentCode
        );


    const records =
        DATA.thiDua.filter(
            row => {

                const code =
                    studentCode(row);


                return codes.includes(
                    code
                );

            }
        );


    if (
        records.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td colspan="6"
                    style="text-align:center;padding:25px;">
                    Chưa có dữ liệu thi đua.
                </td>
            </tr>
            `;

        return;

    }


    records.forEach(
        (row, index) => {

            const code =
                studentCode(row);


            const date =
                getValue(
                    row,
                    [
                        "Ngày",
                        "Ngay",
                        "Date"
                    ]
                );


            const className =
                rowClass(row) ||
                currentClass;


            const content =
                getValue(
                    row,
                    [
                        "Nội dung",
                        "Noi dung",
                        "Nội dung thi đua"
                    ]
                );


            const point =
                getValue(
                    row,
                    [
                        "Điểm",
                        "Diem",
                        "Điểm thi đua"
                    ]
                );


            tbody.innerHTML +=
                `
                <tr>

                    <td>${index + 1}</td>

                    <td>${escapeHTML(code)}</td>

                    <td>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(className)}
                    </td>

                    <td>
                        ${escapeHTML(
                            content || "—"
                        )}
                    </td>

                    <td>
                        <b>${escapeHTML(
                            String(point || "0")
                        )}</b>
                    </td>

                </tr>
                `;

        }
    );

}


/* =========================================================
   ĐIỂM DANH
========================================================= */

function renderAttendance(
    students
) {

    const tbody =
        document.getElementById(
            "attendanceTable"
        );


    tbody.innerHTML = "";


    const codes =
        students.map(
            studentCode
        );


    const records =
        DATA.diemDanh.filter(
            row =>
                codes.includes(
                    studentCode(row)
                )
        );


    if (
        records.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td colspan="6"
                    style="text-align:center;padding:25px;">
                    Chưa có dữ liệu điểm danh.
                </td>
            </tr>
            `;

        return;

    }


    records.forEach(
        (row, index) => {

            const code =
                studentCode(row);


            const name =
                studentName(row);


            const status =
                getValue(
                    row,
                    [
                        "Trạng thái",
                        "Trang thai",
                        "Status"
                    ]
                ) ||
                "Chưa xác định";


            const date =
                getValue(
                    row,
                    [
                        "Ngày",
                        "Ngay",
                        "Date"
                    ]
                );


            const note =
                getValue(
                    row,
                    [
                        "Ghi chú",
                        "Ghi chu",
                        "Note"
                    ]
                );


            const statusHTML =
                createStatusHTML(
                    status
                );


            tbody.innerHTML +=
                `
                <tr>

                    <td>${index + 1}</td>

                    <td>${escapeHTML(code)}</td>

                    <td>${escapeHTML(name)}</td>

                    <td>${statusHTML}</td>

                    <td>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            note || "—"
                        )}
                    </td>

                </tr>
                `;

        }
    );


    updateAttendanceStats(
        records
    );

}


/* =========================================================
   TRẠNG THÁI
========================================================= */

function createStatusHTML(
    status
) {

    const s =
        String(status)
            .trim()
            .toLowerCase();


    let cls =
        "status-unknown";


    if (
        s.includes("có mặt") ||
        s.includes("co mat") ||
        s === "present"
    ) {

        cls =
            "status-present";

    }
    else if (
        s.includes("vắng") ||
        s.includes("vang") ||
        s === "absent"
    ) {

        cls =
            "status-absent";

    }
    else if (
        s.includes("muộn") ||
        s.includes("muon") ||
        s.includes("trễ") ||
        s.includes("tre") ||
        s === "late"
    ) {

        cls =
            "status-late";

    }


    return `
        <span class="status ${cls}">
            ${escapeHTML(status)}
        </span>
    `;

}


/* =========================================================
   THỐNG KÊ ĐIỂM DANH
========================================================= */

function updateAttendanceStats(
    records
) {

    let present = 0;

    let absent = 0;

    let late = 0;

    let unknown = 0;


    records.forEach(
        row => {

            const status =
                String(
                    getValue(
                        row,
                        [
                            "Trạng thái",
                            "Trang thai",
                            "Status"
                        ]
                    )
                )
                    .toLowerCase();


            if (
                status.includes("có mặt") ||
                status.includes("co mat") ||
                status === "present"
            ) {

                present++;

            }
            else if (
                status.includes("vắng") ||
                status.includes("vang") ||
                status === "absent"
            ) {

                absent++;

            }
            else if (
                status.includes("muộn") ||
                status.includes("muon") ||
                status.includes("trễ") ||
                status.includes("tre") ||
                status === "late"
            ) {

                late++;

            }
            else {

                unknown++;

            }

        }
    );


    /*
       Nếu chưa có các thẻ
       thì không làm gì.
    */

}


/* =========================================================
   TÍNH THỐNG KÊ ĐIỂM
========================================================= */

function calculateStatistics(
    students
) {

    const averages = [];


    students.forEach(
        student => {

            const code =
                studentCode(student);


            const row =
                findScoreRow(code);


            if (!row) return;


            let avg =
                toNumber(
                    getValue(
                        row,
                        [
                            "Điểm TB",
                            "Diem TB",
                            "ĐTB",
                            "DTB",
                            "TB"
                        ]
                    )
                );


            if (
                avg === null
            ) {

                const values =
                    [
                        "TX1",
                        "TX2",
                        "TX3",
                        "TX4"
                    ]
                        .map(
                            name =>
                                toNumber(
                                    getValue(
                                        row,
                                        [name]
                                    )
                                )
                        )
                        .filter(
                            x =>
                                x !== null
                        );


                if (
                    values.length
                ) {

                    avg =
                        values.reduce(
                            (a,b) =>
                                a + b,
                            0
                        ) /
                        values.length;

                }

            }


            if (
                avg !== null
            ) {

                averages.push(
                    avg
                );

            }

        }
    );


    /*
       Điểm trung bình
    */

    if (
        averages.length
    ) {

        const total =
            averages.reduce(
                (a,b) =>
                    a + b,
                0
            );


        const average =
            total /
            averages.length;


        document.getElementById(
            "averageScore"
        ).textContent =
            average.toFixed(1);


        const good =
            averages.filter(
                score =>
                    score >= 8
            ).length;


        const percent =
            (
                good /
                averages.length
            ) * 100;


        document.getElementById(
            "goodPercent"
        ).textContent =
            Math.round(percent) +
            "%";


        /*
           Phân loại
        */

        const excellent =
            averages.filter(
                score =>
                    score >= 9
            ).length;


        const goodCount =
            averages.filter(
                score =>
                    score >= 8 &&
                    score < 9
            ).length;


        const averageCount =
            averages.filter(
                score =>
                    score >= 6.5 &&
                    score < 8
            ).length;


        const low =
            averages.filter(
                score =>
                    score < 6.5
            ).length;


        updateLearning(
            "excellent",
            excellent,
            averages.length
        );


        updateLearning(
            "good",
            goodCount,
            averages.length
        );


        updateLearning(
            "average",
            averageCount,
            averages.length
        );


        updateLearning(
            "low",
            low,
            averages.length
        );

    }
    else {

        document.getElementById(
            "averageScore"
        ).textContent =
            "—";


        document.getElementById(
            "goodPercent"
        ).textContent =
            "0";


        updateLearning(
            "excellent",
            0,
            0
        );


        updateLearning(
            "good",
            0,
            0
        );


        updateLearning(
            "average",
            0,
            0
        );


        updateLearning(
            "low",
            0,
            0
        );

    }

}


/* =========================================================
   CẬP NHẬT THANH ĐIỂM
========================================================= */

function updateLearning(
    type,
    count,
    total
) {

    const percent =
        total
            ? (count / total) * 100
            : 0;


    const bar =
        document.getElementById(
            type + "Bar"
        );


    const number =
        document.getElementById(
            type + "Count"
        );


    if (bar) {

        bar.style.width =
            percent + "%";

    }


    if (number) {

        number.textContent =
            count;

    }

}


/* =========================================================
   HỌC SINH CẦN CHÚ Ý
========================================================= */

function renderAttention(
    students
) {

    const container =
        document.getElementById(
            "attentionList"
        );


    const list = [];


    students.forEach(
        student => {

            const code =
                studentCode(student);


            const row =
                findScoreRow(code);


            if (!row) return;


            const avg =
                toNumber(
                    getValue(
                        row,
                        [
                            "Điểm TB",
                            "Diem TB",
                            "ĐTB",
                            "DTB",
                            "TB"
                        ]
                    )
                );


            if (
                avg !== null &&
                avg < 6.5
            ) {

                list.push({
                    name:
                        studentName(
                            student
                        ),
                    score:
                        avg
                });

            }

        }
    );


    list.sort(
        (a,b) =>
            a.score -
            b.score
    );


    const show =
        list.slice(
            0,
            5
        );


    if (
        show.length === 0
    ) {

        container.innerHTML =
            `
            <div
                style="
                text-align:center;
                padding:25px;
                color:#8490a8;">
                🎉 Chưa có học sinh cần chú ý.
            </div>
            `;

        return;

    }


    container.innerHTML = "";


    show.forEach(
        student => {

            const initials =
                student.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map(
                        x =>
                            x[0]
                    )
                    .join("")
                    .toUpperCase();


            container.innerHTML +=
                `
                <div class="attention-item">

                    <div class="student-info">

                        <div class="student-avatar">
                            ${escapeHTML(initials)}
                        </div>

                        <div>

                            <div class="student-name">
                                ${escapeHTML(
                                    student.name
                                )}
                            </div>

                            <div class="student-detail">
                                Cần được động viên
                            </div>

                        </div>

                    </div>

                    <div class="score-badge">
                        ${student.score.toFixed(1)}
                    </div>

                </div>
                `;

        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   THÔNG BÁO LỖI
========================================================= */

function showError(
    message
) {

    const box =
        document.getElementById(
            "errorBox"
        );


    if (!box) return;


    if (!message) {

        box.style.display =
            "none";

        box.textContent =
            "";

        return;

    }


    box.style.display =
        "block";

    box.textContent =
        "⚠️ " +
        message;

}


/* =========================================================
   NGÀY HIỆN TẠI
========================================================= */

function updateToday() {

    const today =
        new Date();


    const days = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy"
    ];


    const text =
        days[today.getDay()] +
        ", " +
        String(
            today.getDate()
        ).padStart(2,"0") +
        "/" +
        String(
            today.getMonth() + 1
        ).padStart(2,"0") +
        "/" +
        today.getFullYear();


    const el =
        document.getElementById(
            "todayText"
        );


    if (el) {

        el.textContent =
            text;

    }

}


/* =========================================================
   SCROLL
========================================================= */

function scrollToTop() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function focusStudents() {

    const el =
        document.getElementById(
            "studentsPanel"
        );


    if (el) {

        el.scrollIntoView({
            behavior: "smooth"
        });

    }

}


function focusScores() {

    const el =
        document.getElementById(
            "scoresPanel"
        );


    if (el) {

        el.scrollIntoView({
            behavior: "smooth"
        });

    }

}


function focusStatistics() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   THÊM HỌC SINH
========================================================= */

function addStudent() {

    alert(
        "Chức năng thêm học sinh sẽ được kết nối với Google Sheet ở bước tiếp theo."
    );

}


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "Ứng dụng bắt đầu..."
        );


        updateToday();


        loadAllData();

    }
);
