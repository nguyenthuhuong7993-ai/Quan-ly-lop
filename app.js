/* =========================================================
   QUẢN LÝ LỚP HỌC
   GOOGLE SHEETS DATABASE
   ========================================================= */


/* =========================================================
   1. CẤU HÌNH GOOGLE SHEETS
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
   2. BIẾN DỮ LIỆU
   ========================================================= */

let DATA = {

    lop: [],

    hocSinh: [],

    diem: [],

    thiDua: [],

    diemDanh: []

};


let selectedClass = "";


/* =========================================================
   3. TIỆN ÍCH
   ========================================================= */

function normalizeText(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, " ");

}


/* =========================================================
   TÌM GIÁ TRỊ THEO NHIỀU TÊN CỘT
   ========================================================= */

function getValue(row, possibleNames) {

    if (!row) return "";

    const keys = Object.keys(row);

    for (const name of possibleNames) {

        const target = normalizeText(name);

        const key = keys.find(k =>
            normalizeText(k) === target
        );

        if (key !== undefined) {

            return row[key];

        }

    }

    return "";

}


/* =========================================================
   LẤY MÃ HỌC SINH
   ========================================================= */

function getStudentCode(row) {

    return String(
        getValue(row, [
            "Mã HS",
            "Ma HS",
            "Mã học sinh",
            "Ma hoc sinh",
            "MAHS",
            "MÃ HS",
            "ID"
        ])
    ).trim();

}


/* =========================================================
   LẤY HỌ TÊN
   ========================================================= */

function getStudentName(row) {

    return String(
        getValue(row, [
            "Họ và tên",
            "Ho va ten",
            "Họ tên",
            "Ho ten",
            "Tên học sinh",
            "Ten hoc sinh",
            "Họ tên học sinh"
        ])
    ).trim();

}


/* =========================================================
   LẤY LỚP
   ========================================================= */

function getStudentClass(row) {

    return String(
        getValue(row, [
            "Lớp",
            "Lop",
            "Tên lớp",
            "Ten lop",
            "Lớp học"
        ])
    ).trim();

}


/* =========================================================
   ĐỌC GOOGLE SHEETS
   ========================================================= */

async function fetchSheet(sheetName) {

    const url =
        "https://docs.google.com/spreadsheets/d/" +
        SHEET_ID +
        "/gviz/tq?tqx=out:json&sheet=" +
        encodeURIComponent(sheetName);


    console.log("Đang tải sheet:", sheetName);


    const response = await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Không thể đọc sheet " +
            sheetName +
            ". HTTP " +
            response.status
        );

    }


    const text = await response.text();


    console.log(
        "Phản hồi sheet",
        sheetName,
        text.substring(0, 100)
    );


    /*
       Google trả về:

       google.visualization.Query.setResponse({...});
    */


    const start = text.indexOf("{");

    const end = text.lastIndexOf("}");


    if (start === -1 || end === -1) {

        throw new Error(
            "Google Sheets không trả về JSON hợp lệ cho sheet " +
            sheetName
        );

    }


    const jsonText =
        text.substring(start, end + 1);


    const json = JSON.parse(jsonText);


    if (
        !json.table ||
        !json.table.cols
    ) {

        return [];

    }


    const columns =
        json.table.cols.map(
            (col, index) => {

                return (
                    col.label ||
                    col.id ||
                    "Cột " + (index + 1)
                );

            }
        );


    const rows =
        (json.table.rows || []).map(
            row => {

                const obj = {};

                columns.forEach(
                    (column, index) => {

                        const cell =
                            row.c?.[index];

                        let value = "";

                        if (
                            cell &&
                            cell.v !== null &&
                            cell.v !== undefined
                        ) {

                            value = cell.v;

                        }

                        obj[column] = value;

                    }
                );


                return obj;

            }
        );


    console.log(
        "Đã tải",
        sheetName,
        rows.length,
        "dòng"
    );


    return rows;

}


/* =========================================================
   4. TẢI TOÀN BỘ DỮ LIỆU
   ========================================================= */

async function loadAllData() {

    showError("");

    showLoading();


    try {

        console.log(
            "========== BẮT ĐẦU TẢI DỮ LIỆU =========="
        );


        const [
            lop,
            hocSinh,
            diem,
            thiDua,
            diemDanh
        ] = await Promise.all([

            fetchSheet(SHEETS.LOP),

            fetchSheet(SHEETS.HOCSINH),

            fetchSheet(SHEETS.DIEM),

            fetchSheet(SHEETS.THIDUA),

            fetchSheet(SHEETS.DIEMDANH)

        ]);


        DATA.lop = lop;

        DATA.hocSinh = hocSinh;

        DATA.diem = diem;

        DATA.thiDua = thiDua;

        DATA.diemDanh = diemDanh;


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


        setupClasses();


        renderAll();


        console.log(
            "========== ĐÃ TẢI XONG =========="
        );


    } catch (error) {

        console.error(error);


        showError(
            "❌ Lỗi tải dữ liệu: " +
            error.message
        );

    }

}


/* =========================================================
   5. HIỂN THỊ LỚP
   ========================================================= */

function setupClasses() {

    const select =
        document.getElementById(
            "classSelect"
        );


    select.innerHTML = "";


    const classes =
        getClassList();


    if (classes.length === 0) {

        select.innerHTML =
            `<option value="">Không có lớp</option>`;

        selectedClass = "";

        return;

    }


    classes.forEach(
        className => {

            const option =
                document.createElement("option");

            option.value = className;

            option.textContent = className;

            select.appendChild(option);

        }
    );


    if (
        !selectedClass ||
        !classes.includes(selectedClass)
    ) {

        selectedClass = classes[0];

    }


    select.value = selectedClass;


    select.onchange = function () {

        selectedClass =
            this.value;

        renderAll();

    };

}


/* =========================================================
   LẤY DANH SÁCH LỚP
   ========================================================= */

function getClassList() {

    const result = [];


    /*
       Trường hợp sheet LOP có cột tên lớp
    */

    DATA.lop.forEach(row => {

        const name =
            String(
                getValue(row, [
                    "Lớp",
                    "Lop",
                    "Tên lớp",
                    "Ten lop",
                    "Tên",
                    "Ten",
                    "Class"
                ])
            ).trim();


        if (
            name &&
            !result.includes(name)
        ) {

            result.push(name);

        }

    });


    /*
       Nếu sheet LOP không có dữ liệu
       thì lấy lớp từ sheet HOCSINH
    */

    if (result.length === 0) {

        DATA.hocSinh.forEach(row => {

            const name =
                getStudentClass(row);


            if (
                name &&
                !result.includes(name)
            ) {

                result.push(name);

            }

        });

    }


    return result;

}


/* =========================================================
   6. LỌC HỌC SINH THEO LỚP
   ========================================================= */

function getStudents() {

    let students =
        DATA.hocSinh;


    if (selectedClass) {

        const hasClassColumn =
            students.some(row =>
                getStudentClass(row) !== ""
            );


        if (hasClassColumn) {

            students =
                students.filter(row =>
                    normalizeText(
                        getStudentClass(row)
                    ) ===
                    normalizeText(
                        selectedClass
                    )
                );

        }

    }


    return students;

}


/* =========================================================
   7. RENDER TẤT CẢ
   ========================================================= */

function renderAll() {

    renderStudents();

    renderScores();

    renderCompetition();

    renderAttendance();

    updateStatistics();

    updateLearning();

    updateAttention();

    updateHeader();

}


/* =========================================================
   8. DANH SÁCH HỌC SINH
   ========================================================= */

function renderStudents() {

    const tbody =
        document.getElementById(
            "studentsTable"
        );


    const search =
        normalizeText(
            document.getElementById(
                "studentSearch"
            )?.value || ""
        );


    let students =
        getStudents();


    if (search) {

        students =
            students.filter(row => {

                const code =
                    normalizeText(
                        getStudentCode(row)
                    );

                const name =
                    normalizeText(
                        getStudentName(row)
                    );


                return (
                    code.includes(search) ||
                    name.includes(search)
                );

            });

    }


    document.getElementById(
        "studentCountText"
    ).textContent =
        students.length + " học sinh";


    if (students.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    Không tìm thấy học sinh.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        students.map(
            (row, index) => {

                const code =
                    getStudentCode(row);

                const name =
                    getStudentName(row);

                const dob =
                    getValue(row, [
                        "Ngày sinh",
                        "Ngay sinh",
                        "DOB"
                    ]);

                const gender =
                    getValue(row, [
                        "Giới tính",
                        "Gioi tinh",
                        "Gender"
                    ]);

                const note =
                    getValue(row, [
                        "Ghi chú",
                        "Ghi chu",
                        "Chú thích",
                        "Chu thich"
                    ]);


                return `
                    <tr>

                        <td>${index + 1}</td>

                        <td>
                            <b>${escapeHTML(code)}</b>
                        </td>

                        <td>
                            ${escapeHTML(name || "—")}
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
        ).join("");

}


/* =========================================================
   9. ĐIỂM
   ========================================================= */

function renderScores() {

    const tbody =
        document.getElementById(
            "scoresTable"
        );


    const students =
        getStudents();


    if (students.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    Chưa có học sinh.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        students.map(
            (student, index) => {

                const code =
                    getStudentCode(student);

                const name =
                    getStudentName(student);


                const score =
                    findScore(code);


                const tx1 =
                    getScoreValue(score, [
                        "TX1",
                        "Tx1",
                        "Điểm TX1"
                    ]);

                const tx2 =
                    getScoreValue(score, [
                        "TX2",
                        "Tx2",
                        "Điểm TX2"
                    ]);

                const tx3 =
                    getScoreValue(score, [
                        "TX3",
                        "Tx3",
                        "Điểm TX3"
                    ]);

                const tx4 =
                    getScoreValue(score, [
                        "TX4",
                        "Tx4",
                        "Điểm TX4"
                    ]);


                const average =
                    calculateAverage([
                        tx1,
                        tx2,
                        tx3,
                        tx4
                    ]);


                return `
                    <tr>

                        <td>${index + 1}</td>

                        <td>${escapeHTML(code)}</td>

                        <td>${escapeHTML(name)}</td>

                        <td>${displayScore(tx1)}</td>

                        <td>${displayScore(tx2)}</td>

                        <td>${displayScore(tx3)}</td>

                        <td>${displayScore(tx4)}</td>

                        <td>
                            <b>
                                ${average === null
                                    ? "—"
                                    : average.toFixed(2)}
                            </b>
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   TÌM ĐIỂM CỦA HỌC SINH
   ========================================================= */

function findScore(code) {

    const target =
        normalizeText(code);


    return DATA.diem.find(row => {

        const rowCode =
            getStudentCode(row);


        return (
            normalizeText(rowCode) === target
        );

    }) || null;

}


/* =========================================================
   LẤY ĐIỂM
   ========================================================= */

function getScoreValue(row, names) {

    if (!row) return null;


    const value =
        getValue(row, names);


    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const number =
        Number(
            String(value)
                .replace(",", ".")
                .replace(/[^0-9.-]/g, "")
        );


    return Number.isFinite(number)
        ? number
        : null;

}


/* =========================================================
   TÍNH ĐIỂM TB
   ========================================================= */

function calculateAverage(values) {

    const valid =
        values.filter(
            value =>
                typeof value === "number" &&
                Number.isFinite(value)
        );


    if (valid.length === 0) {

        return null;

    }


    return (
        valid.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / valid.length
    );

}


/* =========================================================
   HIỂN THỊ ĐIỂM
   ========================================================= */

function displayScore(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    return Number(value).toString();

}


/* =========================================================
   10. THI ĐUA
   ========================================================= */

function renderCompetition() {

    const tbody =
        document.getElementById(
            "competitionTable"
        );


    if (!DATA.thiDua.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="empty">
                    Chưa có dữ liệu thi đua.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        DATA.thiDua.map(
            (row, index) => {

                const code =
                    getStudentCode(row);

                const date =
                    getValue(row, [
                        "Ngày",
                        "Ngay",
                        "Ngày thi đua",
                        "Date"
                    ]);

                const type =
                    getValue(row, [
                        "Loại",
                        "Loai",
                        "Hình thức",
                        "Hinh thuc"
                    ]);

                const content =
                    getValue(row, [
                        "Nội dung",
                        "Noi dung",
                        "Lý do",
                        "Ly do"
                    ]);

                const point =
                    getValue(row, [
                        "Điểm",
                        "Diem",
                        "Điểm thi đua"
                    ]);


                return `
                    <tr>

                        <td>${index + 1}</td>

                        <td>${escapeHTML(code)}</td>

                        <td>${escapeHTML(
                            formatDate(date)
                        )}</td>

                        <td>${escapeHTML(
                            type || "—"
                        )}</td>

                        <td>${escapeHTML(
                            content || "—"
                        )}</td>

                        <td>
                            <b>${escapeHTML(
                                point || "—"
                            )}</b>
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   11. ĐIỂM DANH
   ========================================================= */

function renderAttendance() {

    const tbody =
        document.getElementById(
            "attendanceTable"
        );


    const students =
        getStudents();


    if (students.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="empty">
                    Chưa có học sinh.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        students.map(
            (student, index) => {

                const code =
                    getStudentCode(student);

                const name =
                    getStudentName(student);


                const attendance =
                    findAttendance(code);


                const status =
                    attendance
                        ? getValue(
                            attendance,
                            [
                                "Trạng thái",
                                "Trang thai",
                                "Status"
                            ]
                        )
                        : "Chưa xác định";


                const date =
                    attendance
                        ? getValue(
                            attendance,
                            [
                                "Ngày",
                                "Ngay",
                                "Ngày điểm danh"
                            ]
                        )
                        : "";


                const note =
                    attendance
                        ? getValue(
                            attendance,
                            [
                                "Ghi chú",
                                "Ghi chu",
                                "Chú thích"
                            ]
                        )
                        : "";


                return `
                    <tr>

                        <td>${index + 1}</td>

                        <td>${escapeHTML(code)}</td>

                        <td>${escapeHTML(name)}</td>

                        <td>
                            ${attendanceBadge(status)}
                        </td>

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
        ).join("");

}


/* =========================================================
   TÌM ĐIỂM DANH
   ========================================================= */

function findAttendance(code) {

    const target =
        normalizeText(code);


    return DATA.diemDanh.find(row => {

        return (
            normalizeText(
                getStudentCode(row)
            ) === target
        );

    }) || null;

}


/* =========================================================
   BADGE ĐIỂM DANH
   ========================================================= */

function attendanceBadge(status) {

    const text =
        String(status || "Chưa xác định");


    const n =
        normalizeText(text);


    let cls = "unknown";


    if (
        n.includes("co mat") ||
        n.includes("present")
    ) {

        cls = "present";

    }
    else if (
        n.includes("vang") ||
        n.includes("absent")
    ) {

        cls = "absent";

    }
    else if (
        n.includes("tre") ||
        n.includes("muon") ||
        n.includes("late")
    ) {

        cls = "late";

    }


    return `
        <span class="badge ${cls}">
            ${escapeHTML(text)}
        </span>
    `;

}


/* =========================================================
   12. THỐNG KÊ
   ========================================================= */

function updateStatistics() {

    const students =
        getStudents();


    document.getElementById(
        "totalStudents"
    ).textContent =
        students.length;


    const averages = [];


    students.forEach(student => {

        const score =
            findScore(
                getStudentCode(student)
            );


        if (!score) return;


        const values = [

            getScoreValue(score, ["TX1"]),

            getScoreValue(score, ["TX2"]),

            getScoreValue(score, ["TX3"]),

            getScoreValue(score, ["TX4"])

        ];


        const average =
            calculateAverage(values);


        if (average !== null) {

            averages.push(average);

        }

    });


    if (averages.length === 0) {

        document.getElementById(
            "averageScore"
        ).textContent = "—";

        document.getElementById(
            "goodPercent"
        ).textContent = "0";

        return;

    }


    const averageClass =
        averages.reduce(
            (a, b) => a + b,
            0
        ) / averages.length;


    document.getElementById(
        "averageScore"
    ).textContent =
        averageClass.toFixed(1);


    const good =
        averages.filter(
            x => x >= 8
        ).length;


    const percent =
        Math.round(
            good /
            averages.length *
            100
        );


    document.getElementById(
        "goodPercent"
    ).textContent =
        percent;

}


/* =========================================================
   13. TÌNH HÌNH HỌC TẬP
   ========================================================= */

function updateLearning() {

    const students =
        getStudents();


    let excellent = 0;

    let good = 0;

    let fair = 0;

    let weak = 0;


    students.forEach(student => {

        const score =
            findScore(
                getStudentCode(student)
            );


        if (!score) return;


        const average =
            calculateAverage([

                getScoreValue(score, ["TX1"]),

                getScoreValue(score, ["TX2"]),

                getScoreValue(score, ["TX3"]),

                getScoreValue(score, ["TX4"])

            ]);


        if (average === null) return;


        if (average >= 9) {

            excellent++;

        }
        else if (average >= 8) {

            good++;

        }
        else if (average >= 6.5) {

            fair++;

        }
        else {

            weak++;

        }

    });


    const total =
        students.length || 1;


    setProgress(
        "excellentBar",
        "excellentCount",
        excellent,
        total
    );


    setProgress(
        "goodBar",
        "goodCount",
        good,
        total
    );


    setProgress(
        "fairBar",
        "fairCount",
        fair,
        total
    );


    setProgress(
        "weakBar",
        "weakCount",
        weak,
        total
    );

}


/* =========================================================
   THANH TIẾN ĐỘ
   ========================================================= */

function setProgress(
    barId,
    countId,
    count,
    total
) {

    const percent =
        Math.round(
            count / total * 100
        );


    document.getElementById(
        barId
    ).style.width =
        percent + "%";


    document.getElementById(
        countId
    ).textContent =
        count;

}


/* =========================================================
   14. HỌC SINH CẦN CHÚ Ý
   ========================================================= */

function updateAttention() {

    const container =
        document.getElementById(
            "attentionList"
        );


    const students =
        getStudents();


    const attention = [];


    students.forEach(student => {

        const code =
            getStudentCode(student);


        const score =
            findScore(code);


        if (!score) return;


        const average =
            calculateAverage([

                getScoreValue(score, ["TX1"]),

                getScoreValue(score, ["TX2"]),

                getScoreValue(score, ["TX3"]),

                getScoreValue(score, ["TX4"])

            ]);


        if (
            average !== null &&
            average < 7
        ) {

            attention.push({

                name:
                    getStudentName(student),

                average

            });

        }

    });


    attention.sort(
        (a, b) =>
            a.average - b.average
    );


    if (attention.length === 0) {

        container.innerHTML = `
            <div class="empty">
                Lớp đang có tín hiệu tốt 🎉
            </div>
        `;

        return;

    }


    container.innerHTML =
        attention.slice(0, 5)
            .map(student => {

                return `
                    <div class="attention-item">

                        <div>

                            <div class="attention-name">
                                ${escapeHTML(
                                    student.name
                                )}
                            </div>

                            <div class="attention-note">
                                Cần được động viên
                            </div>

                        </div>

                        <div class="attention-score">
                            ${student.average.toFixed(1)}
                        </div>

                    </div>
                `;

            })
            .join("");

}


/* =========================================================
   15. HEADER
   ========================================================= */

function updateHeader() {

    const className =
        selectedClass || "—";


    document.getElementById(
        "className"
    ).textContent =
        "Lớp " + className;


    document.getElementById(
        "teacherClass"
    ).textContent =
        className;


    const select =
        document.getElementById(
            "classSelect"
        );


    if (select) {

        select.value =
            selectedClass;

    }

}


/* =========================================================
   16. NGÀY HIỆN TẠI
   ========================================================= */

function setupDate() {

    const today =
        new Date();


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const year =
        today.getFullYear();


    document.getElementById(
        "currentDate"
    ).textContent =
        `${getWeekday(today)}, ${day}/${month}/${year}`;


    const dateInput =
        document.getElementById(
            "attendanceDate"
        );


    dateInput.value =
        `${year}-${month}-${day}`;

}


/* =========================================================
   THỨ
   ========================================================= */

function getWeekday(date) {

    const days = [

        "Chủ nhật",

        "Thứ Hai",

        "Thứ Ba",

        "Thứ Tư",

        "Thứ Năm",

        "Thứ Sáu",

        "Thứ Bảy"

    ];


    return days[
        date.getDay()
    ];

}


/* =========================================================
   17. FORMAT NGÀY
   ========================================================= */

function formatDate(value) {

    if (!value) return "—";


    const text =
        String(value).trim();


    /*
       Google Sheets đôi khi trả:

       2014-03-12
       12/03/2014
       Date(2014,2,12)
    */


    const match =
        text.match(
            /^Date\((\d+),(\d+),(\d+)\)$/
        );


    if (match) {

        return (
            String(
                Number(match[3])
            ).padStart(2, "0")
            +
            "/"
            +
            String(
                Number(match[2]) + 1
            ).padStart(2, "0")
            +
            "/"
            +
            match[1]
        );

    }


    if (
        /^\d{4}-\d{2}-\d{2}$/
            .test(text)
    ) {

        const [
            y,
            m,
            d
        ] =
            text.split("-");


        return `${d}/${m}/${y}`;

    }


    return text;

}


/* =========================================================
   18. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   19. LOADING
   ========================================================= */

function showLoading() {

    document.getElementById(
        "studentsTable"
    ).innerHTML = `
        <tr>
            <td colspan="6"
                class="loading">
                ⏳ Đang tải dữ liệu...
            </td>
        </tr>
    `;


    document.getElementById(
        "scoresTable"
    ).innerHTML = `
        <tr>
            <td colspan="8"
                class="loading">
                ⏳ Đang tải dữ liệu...
            </td>
        </tr>
    `;

}


/* =========================================================
   20. HIỂN THỊ LỖI
   ========================================================= */

function showError(message) {

    const box =
        document.getElementById(
            "errorBox"
        );


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
        message;

}


/* =========================================================
   21. SCROLL
   ========================================================= */

function scrollToSection(id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =========================================================
   22. MENU
   ========================================================= */

function showSection(section) {

    if (section === "overview") {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


/* =========================================================
   23. THÊM HỌC SINH
   ========================================================= */

function addStudent() {

    alert(
        "Chức năng thêm học sinh sẽ được kết nối với Google Sheets ở bước tiếp theo."
    );

}


/* =========================================================
   24. KHỞI ĐỘNG
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Ứng dụng Quản lý lớp học bắt đầu..."
        );


        setupDate();


        loadAllData();

    }
);
