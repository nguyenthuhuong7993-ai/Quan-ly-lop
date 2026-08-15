"use strict";


/* =========================================================
   CẤU HÌNH GOOGLE SHEETS
========================================================= */

const CONFIG = {

    spreadsheetId:
        "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU",

    sheets: {

        classes: "LOP",

        students: "HOCSINH",

        scores: "DIEM",

        competition: "THIDUA",

        attendance: "DIEMDANH"

    }

};


/* =========================================================
   STATE
========================================================= */

const state = {

    classes: [],

    students: [],

    scores: [],

    competition: [],

    attendance: [],

    selectedClass: "",

    selectedDate: "",

    search: "",

    cameraStream: null

};


/* =========================================================
   HELPER
========================================================= */

const $ = id =>
    document.getElementById(id);


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    setToday();

    bindEvents();

    await loadAllData();

}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {


    $("classSelect").addEventListener(
        "change",
        () => {

            state.selectedClass =
                $("classSelect").value;

            syncClassUI();

            renderAll();

        }
    );


    $("studentSearch").addEventListener(
        "input",
        () => {

            state.search =
                $("studentSearch").value.trim();

            renderAll();

        }
    );


    $("attendanceDate").addEventListener(
        "change",
        () => {

            state.selectedDate =
                $("attendanceDate").value;

            renderAll();

        }
    );


    $("reloadBtn").addEventListener(
        "click",
        loadAllData
    );


    $("openClassBtn").addEventListener(
        "click",
        () => {

            scrollToId(
                "studentsSection"
            );

        }
    );


    $("scrollAttendance").addEventListener(
        "click",
        () => {

            scrollToId(
                "statsSection"
            );

        }
    );


    $("addStudentBtn").addEventListener(
        "click",
        () => {

            showStatus(
                "Chức năng thêm học sinh cần kết nối phần ghi dữ liệu vào Google Sheets. Phiên bản hiện tại đang ở chế độ an toàn: chỉ đọc dữ liệu.",
                "info"
            );

        }
    );


    document
        .querySelectorAll("[data-target]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.target;

                    scrollToId(id);

                    document
                        .querySelectorAll(".nav button")
                        .forEach(item => {

                            item.classList.toggle(
                                "active",
                                item.dataset.target === id
                            );

                        });

                }
            );

        });


    $("startCameraBtn")
        .addEventListener(
            "click",
            startCamera
        );


    $("stopCameraBtn")
        .addEventListener(
            "click",
            stopCamera
        );


    $("captureBtn")
        .addEventListener(
            "click",
            capturePhoto
        );


    window.addEventListener(
        "beforeunload",
        stopCamera
    );

}


/* =========================================================
   SCROLL
========================================================= */

function scrollToId(id) {

    const element =
        $(id);

    if (!element) return;

    element.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


/* =========================================================
   NGÀY HIỆN TẠI
========================================================= */

function setToday() {

    const now =
        new Date();


    const local =
        new Date(
            now.getTime()
            -
            now.getTimezoneOffset()
            * 60000
        );


    const iso =
        local
            .toISOString()
            .slice(0, 10);


    $("attendanceDate").value =
        iso;


    state.selectedDate =
        iso;


    $("todayText").textContent =
        new Intl.DateTimeFormat(
            "vi-VN",
            {

                weekday: "long",

                day: "2-digit",

                month: "2-digit",

                year: "numeric"

            }
        ).format(now);

}


/* =========================================================
   LOAD TOÀN BỘ DỮ LIỆU
========================================================= */

async function loadAllData() {

    showStatus(
        "Đang đồng bộ dữ liệu từ Google Sheets...",
        "info"
    );


    try {


        const [

            classes,

            students,

            scores,

            competition,

            attendance

        ] = await Promise.all([

            fetchSheet(
                CONFIG.sheets.classes
            ),

            fetchSheet(
                CONFIG.sheets.students
            ),

            fetchSheet(
                CONFIG.sheets.scores
            ),

            fetchSheet(
                CONFIG.sheets.competition
            ),

            fetchSheet(
                CONFIG.sheets.attendance
            )

        ]);


        state.classes =
            classes;

        state.students =
            students;

        state.scores =
            scores;

        state.competition =
            competition;

        state.attendance =
            attendance;


        populateClassSelect();


        if (
            !state.selectedClass
            &&
            state.classes.length
        ) {

            const first =
                state.classes[0];


            state.selectedClass =
                first.Malop
                ||
                first.MaLop
                ||
                first.TenLop
                ||
                "";

        }


        $("classSelect").value =
            state.selectedClass;


        syncClassUI();


        renderAll();


        showStatus(
            `Đã đồng bộ ${state.students.length} học sinh từ Google Sheets.`,
            "success"
        );


        console.log(
            "Dữ liệu lớp:",
            state.classes
        );

        console.log(
            "Dữ liệu học sinh:",
            state.students
        );

        console.log(
            "Dữ liệu điểm:",
            state.scores
        );

        console.log(
            "Dữ liệu thi đua:",
            state.competition
        );

        console.log(
            "Dữ liệu điểm danh:",
            state.attendance
        );


    }
    catch (error) {

        console.error(
            "Lỗi tải dữ liệu:",
            error
        );


        showStatus(

            "Không tải được dữ liệu Google Sheets. " +
            "Hãy kiểm tra Sheet đã bật quyền " +
            "Bất kỳ ai có liên kết → Người xem. " +
            "Chi tiết: "
            +
            error.message,

            "error"

        );


        renderEmptyState();

    }

}


/* =========================================================
   ĐỌC GOOGLE SHEETS
========================================================= */

async function fetchSheet(
    sheetName
) {


    const url =
        `https://docs.google.com/spreadsheets/d/` +
        `${CONFIG.spreadsheetId}` +
        `/gviz/tq?tqx=out:json&sheet=` +
        `${encodeURIComponent(sheetName)}`;


    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `${sheetName}: HTTP ${response.status}`
        );

    }


    const text =
        await response.text();


    const start =
        text.indexOf("{");


    const end =
        text.lastIndexOf("}");


    if (
        start < 0
        ||
        end < 0
    ) {

        throw new Error(
            `${sheetName}: Google trả về dữ liệu không hợp lệ`
        );

    }


    const data =
        JSON.parse(
            text.slice(
                start,
                end + 1
            )
        );


    return gvizToObjects(
        data.table
    );

}


/* =========================================================
   CHUYỂN GVIZ THÀNH OBJECT
========================================================= */

function gvizToObjects(table) {


    const headers =
        table.cols.map(
            (column, index) =>
                String(
                    column.label
                    ||
                    column.id
                    ||
                    `col${index + 1}`
                ).trim()
        );


    return table.rows.map(
        row => {

            const object = {};


            headers.forEach(
                (header, index) => {

                    object[header] =
                        normalizeCell(
                            row.c?.[index]
                        );

                }
            );


            return object;

        }
    );

}


/* =========================================================
   CHUẨN HÓA CELL
========================================================= */

function normalizeCell(cell) {

    if (!cell) return "";


    const value =
        cell.v;


    if (
        typeof value === "string"
    ) {

        const match =
            value.match(
                /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/
            );


        if (match) {

            return new Date(

                +match[1],

                +match[2],

                +match[3],

                +(match[4] || 0),

                +(match[5] || 0),

                +(match[6] || 0)

            );

        }

    }


    return value;

}


/* =========================================================
   DANH SÁCH LỚP
========================================================= */

function populateClassSelect() {


    const select =
        $("classSelect");


    if (
        !state.classes.length
    ) {

        select.innerHTML =
            `<option value="">
                Không có lớp
            </option>`;

        return;

    }


    select.innerHTML =
        state.classes
            .map(classItem => {


                const code =
                    safe(
                        classItem.Malop
                        ||
                        classItem.MaLop
                        ||
                        classItem.TenLop
                    );


                const name =
                    safe(
                        classItem.TenLop
                        ||
                        classItem.Malop
                        ||
                        classItem.MaLop
                    );


                return `
                    <option value="${esc(code)}">
                        ${esc(name)}
                    </option>
                `;

            })
            .join("");

}


/* =========================================================
   CẬP NHẬT TÊN LỚP
========================================================= */

function syncClassUI() {

    const name =
        state.selectedClass
        ||
        "—";


    $("dashClass").textContent =
        name;


    $("profileClass").textContent =
        name;

}


/* =========================================================
   RENDER
========================================================= */

function renderAll() {

    renderAttendance();

    renderStudents();

    renderScores();

    renderCompetition();

    renderDashboard();

}


/* =========================================================
   EMPTY STATE
========================================================= */

function renderEmptyState() {


    [

        "studentsTable",

        "scoresTable",

        "competitionTable",

        "attendanceTable"

    ].forEach(id => {

        $(id).innerHTML =
            empty(
                "Chưa có dữ liệu."
            );

    });


    $("learningBars").innerHTML =
        empty(
            "Chưa có dữ liệu điểm."
        );


    $("attentionList").innerHTML =
        empty(
            "Chưa có học sinh cần chú ý."
        );

}


/* =========================================================
   HỌC SINH CỦA LỚP
========================================================= */

function studentsOfClass() {


    let rows =
        state.students.filter(
            student =>
                same(
                    student.MaLop
                    ||
                    student.Malop,

                    state.selectedClass
                )
        );


    if (state.search) {

        const query =
            norm(
                state.search
            );


        rows =
            rows.filter(
                student =>

                    norm(
                        student.MaHS
                    ).includes(query)

                    ||

                    norm(
                        student.HoTen
                    ).includes(query)

            );

    }


    return rows.sort(
        (a,b) =>
            (+a.STT || 0)
            -
            (+b.STT || 0)
    );

}


/* =========================================================
   TẤT CẢ HỌC SINH CỦA LỚP
========================================================= */

function allClassStudents() {

    return state.students

        .filter(
            student =>
                same(
                    student.MaLop
                    ||
                    student.Malop,

                    state.selectedClass
                )
        )

        .sort(
            (a,b) =>
                (+a.STT || 0)
                -
                (+b.STT || 0)
        );

}


/* =========================================================
   DANH SÁCH HỌC SINH
========================================================= */

function renderStudents() {


    const rows =
        studentsOfClass();


    $("studentCount").textContent =
        `${rows.length} học sinh`;


    if (!rows.length) {

        $("studentsTable").innerHTML =
            empty(
                "Không tìm thấy học sinh."
            );

        return;

    }


    $("studentsTable").innerHTML =
        table(

            `
            <tr>

                <th>STT</th>

                <th>MÃ HS</th>

                <th>Họ và tên</th>

                <th>Ngày sinh</th>

                <th>Giới tính</th>

                <th>Ghi chú</th>

            </tr>
            `,

            rows.map(
                (student,index) => `

                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        <b>
                            ${esc(student.MaHS)}
                        </b>
                    </td>

                    <td>
                        ${esc(student.HoTen)}
                    </td>

                    <td>
                        ${formatDate(
                            student.NgaySinh
                        )}
                    </td>

                    <td>
                        ${esc(
                            student.Gioitinh
                            ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${esc(
                            student.Ghichu
                            ||
                            "—"
                        )}
                    </td>

                </tr>

                `
            ).join("")

        );

}


/* =========================================================
   ĐIỂM CỦA HỌC SINH
========================================================= */

function scoreFor(
    id
) {

    return (
        state.scores.find(
            score =>
                same(
                    score.MaHS,
                    id
                )
        )
        ||
        {}
    );

}


/* =========================================================
   BẢNG ĐIỂM
========================================================= */

function renderScores() {


    const rows =
        studentsOfClass();


    if (!rows.length) {

        $("scoresTable").innerHTML =
            empty(
                "Chưa có học sinh."
            );

        return;

    }


    $("scoresTable").innerHTML =
        table(

            `
            <tr>

                <th>STT</th>

                <th>MÃ HS</th>

                <th>Họ và tên</th>

                <th>TX1</th>

                <th>TX2</th>

                <th>TX3</th>

                <th>TX4</th>

                <th>Điểm TB</th>

            </tr>
            `,

            rows.map(
                (student,index) => {


                    const data =
                        scoreFor(
                            student.MaHS
                        );


                    const avg =
                        average([
                            data.TX1,
                            data.TX2,
                            data.TX3,
                            data.TX4
                        ]);


                    return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${esc(
                                student.MaHS
                            )}
                        </td>

                        <td>
                            ${esc(
                                student.HoTen
                            )}
                        </td>

                        <td>
                            ${num(data.TX1)}
                        </td>

                        <td>
                            ${num(data.TX2)}
                        </td>

                        <td>
                            ${num(data.TX3)}
                        </td>

                        <td>
                            ${num(data.TX4)}
                        </td>

                        <td>
                            <b>
                                ${
                                    avg == null
                                    ?
                                    "—"
                                    :
                                    avg.toFixed(2)
                                }
                            </b>
                        </td>

                    </tr>

                    `;

                }
            ).join("")

        );

}


/* =========================================================
   THI ĐUA
========================================================= */

function renderCompetition() {


    const rows =
        state.competition

            .filter(
                item =>
                    same(
                        item.MaLop
                        ||
                        item.Malop,

                        state.selectedClass
                    )
            )

            .filter(
                item =>
                    !state.selectedDate
                    ||
                    sameDate(
                        item.Ngay,
                        state.selectedDate
                    )
            );


    $("competitionTable").innerHTML = `

        <div
            class="panel-head"
            style="margin-top:0"
        >

            <div>

                <h3>
                    🏆 Thi đua
                </h3>

                <p>
                    ${rows.length}
                    hoạt động trong ngày đã chọn
                </p>

            </div>

        </div>

    `

    +

    (

        rows.length

        ?

        table(

            `
            <tr>

                <th>STT</th>

                <th>MÃ HS</th>

                <th>Ngày</th>

                <th>Loại</th>

                <th>Nội dung</th>

                <th>Điểm</th>

            </tr>
            `,

            rows.map(
                (row,index) => {


                    const positive =
                        +row.Diem >= 0;


                    return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${esc(
                                row.MaHS
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                row.Ngay
                            )}
                        </td>

                        <td>

                            <span
                                class="badge ${
                                    positive
                                    ?
                                    "plus"
                                    :
                                    "minus"
                                }">

                                ${esc(
                                    row.Loai
                                    ||
                                    "—"
                                )}

                            </span>

                        </td>

                        <td>
                            ${esc(
                                row.NoiDung
                                ||
                                "—"
                            )}
                        </td>

                        <td>

                            <b>

                                ${
                                    +row.Diem > 0
                                    ?
                                    "+"
                                    :
                                    ""
                                }

                                ${esc(
                                    row.Diem
                                )}

                            </b>

                        </td>

                    </tr>

                    `;

                }
            ).join("")

        )

        :

        empty(
            "Chưa có dữ liệu thi đua."
        )

    );

}


/* =========================================================
   ĐIỂM DANH
========================================================= */

function renderAttendance() {


    const students =
        allClassStudents();


    const map =
        new Map();


    state.attendance

        .filter(
            item =>
                same(
                    item.MaLop
                    ||
                    item.Malop,

                    state.selectedClass
                )
        )

        .filter(
            item =>
                !state.selectedDate
                ||
                sameDate(
                    item.Ngay,
                    state.selectedDate
                )
        )

        .forEach(
            item =>
                map.set(
                    String(item.MaHS),
                    item
                )
        );


    let present = 0;

    let late = 0;

    let absent = 0;

    let unknown = 0;


    const rows =
        students.map(
            (student,index) => {


                const attendance =
                    map.get(
                        String(
                            student.MaHS
                        )
                    );


                const currentStatus =
                    attendance
                    ?
                    status(
                        attendance.Trangthai
                    )
                    :
                    "Chưa xác định";


                if (
                    currentStatus
                    ===
                    "Có mặt"
                ) {

                    present++;

                }

                else if (
                    currentStatus
                    ===
                    "Đi muộn"
                ) {

                    late++;

                }

                else if (
                    currentStatus
                    ===
                    "Vắng"
                ) {

                    absent++;

                }

                else {

                    unknown++;

                }


                return {

                    student,

                    attendance,

                    currentStatus,

                    index

                };

            }
        );


    $("dashTotal").innerHTML = `

        ${students.length}

        <span>
            học sinh
        </span>

    `;


    if (!students.length) {

        $("attendanceTable").innerHTML =
            empty(
                "Chưa có học sinh."
            );

        return;

    }


    $("attendanceTable").innerHTML = `

        <div class="panel-head">

            <div>

                <h3>
                    📅 Điểm danh
                </h3>

                <p>

                    ${formatDate(
                        state.selectedDate
                    )}

                    · Có mặt
                    ${present}

                    · Muộn
                    ${late}

                    · Vắng
                    ${absent}

                </p>

            </div>

        </div>

    `

    +

    table(

        `
        <tr>

            <th>STT</th>

            <th>MÃ HS</th>

            <th>Họ tên</th>

            <th>Trạng thái</th>

            <th>Ngày</th>

            <th>Ghi chú</th>

        </tr>
        `,

        rows.map(
            row => `

            <tr>

                <td>
                    ${row.index + 1}
                </td>

                <td>
                    ${esc(
                        row.student.MaHS
                    )}
                </td>

                <td>
                    ${esc(
                        row.student.HoTen
                    )}
                </td>

                <td>
                    ${badge(
                        row.currentStatus
                    )}
                </td>

                <td>
                    ${formatDate(
                        row.attendance?.Ngay
                        ||
                        state.selectedDate
                    )}
                </td>

                <td>
                    ${esc(
                        row.attendance?.Ghichu
                        ||
                        "—"
                    )}
                </td>

            </tr>

            `
        ).join("")

    );

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {


    const students =
        allClassStudents();


    const avgs =
        students

            .map(
                student =>
                    average([

                        scoreFor(
                            student.MaHS
                        ).TX1,

                        scoreFor(
                            student.MaHS
                        ).TX2,

                        scoreFor(
                            student.MaHS
                        ).TX3,

                        scoreFor(
                            student.MaHS
                        ).TX4

                    ])
            )

            .filter(
                value =>
                    value != null
            );


    const averageAll =
        avgs.length

        ?

        avgs.reduce(
            (a,b) =>
                a + b,
            0
        )
        /
        avgs.length

        :

        null;


    const good =
        avgs.length

        ?

        Math.round(

            avgs.filter(
                value =>
                    value >= 8
            ).length
            /
            avgs.length
            *
            100

        )

        :

        0;


    $("dashAverage").innerHTML = `

        ${
            averageAll == null
            ?
            "—"
            :
            averageAll.toFixed(1)
        }

        <span>
            /10
        </span>

    `;


    $("dashGood").innerHTML = `

        ${good}

        <span>
            %
        </span>

    `;


    /* =========================
       PHÂN LOẠI
    ========================= */


    const groups = [

        {
            name:"Xuất sắc",
            className:"excellent"
        },

        {
            name:"Tốt",
            className:"good"
        },

        {
            name:"Khá",
            className:"fair"
        },

        {
            name:"Cần cố gắng",
            className:"need"
        }

    ];


    const counts = [
        0,
        0,
        0,
        0
    ];


    avgs.forEach(
        value => {

            if (value >= 9) {

                counts[0]++;

            }

            else if (value >= 8) {

                counts[1]++;

            }

            else if (value >= 6.5) {

                counts[2]++;

            }

            else {

                counts[3]++;

            }

        }
    );


    const max =
        Math.max(
            ...counts,
            1
        );


    $("learningBars").innerHTML =

        groups.map(
            (group,index) => `

            <div class="bar-row">

                <span>
                    ${group.name}
                </span>

                <div class="bar-bg">

                    <div
                        class="bar ${group.className}"
                        style="
                            width:
                            ${
                                counts[index]
                                /
                                max
                                *
                                100
                            }%
                        "
                    >
                    </div>

                </div>

                <b>
                    ${counts[index]}
                </b>

            </div>

            `
        ).join("");


    /* =========================
       HỌC SINH CẦN CHÚ Ý
    ========================= */


    const attention =
        students

            .map(
                student => ({

                    student,

                    avg:
                        average([

                            scoreFor(
                                student.MaHS
                            ).TX1,

                            scoreFor(
                                student.MaHS
                            ).TX2,

                            scoreFor(
                                student.MaHS
                            ).TX3,

                            scoreFor(
                                student.MaHS
                            ).TX4

                        ])

                })
            )

            .filter(
                item =>
                    item.avg != null
                    &&
                    item.avg < 6.5
            )

            .sort(
                (a,b) =>
                    a.avg - b.avg
            )

            .slice(
                0,
                4
            );


    $("attentionList").innerHTML =

        attention.length

        ?

        attention.map(
            item => `

            <div class="attention-item">

                <div class="mini-avatar">

                    ${initials(
                        item.student.HoTen
                    )}

                </div>


                <div class="attention-main">

                    <strong>

                        ${esc(
                            item.student.HoTen
                        )}

                    </strong>

                    <span>

                        ${esc(
                            item.student.MaHS
                        )}

                        · Cần động viên thêm

                    </span>

                </div>


                <span class="score-chip">

                    ${item.avg.toFixed(1)}

                </span>

            </div>

            `
        ).join("")

        :

        empty(
            "Lớp đang có tín hiệu tốt 🎉"
        );

}


/* =========================================================
   TABLE
========================================================= */

function table(
    head,
    body
) {

    return `

        <div class="table-wrap">

            <table>

                <thead>

                    ${head}

                </thead>

                <tbody>

                    ${body}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   SO SÁNH
========================================================= */

function same(
    a,
    b
) {

    return String(
        a ?? ""
    )
    .trim()
    .toLowerCase()

    ===

    String(
        b ?? ""
    )
    .trim()
    .toLowerCase();

}


/* =========================================================
   TÌM KIẾM KHÔNG DẤU
========================================================= */

function norm(
    value
) {

    return String(
        value ?? ""
    )

    .normalize(
        "NFD"
    )

    .replace(
        /[\u0300-\u036f]/g,
        ""
    )

    .toLowerCase()
    .trim();

}


/* =========================================================
   SO SÁNH NGÀY
========================================================= */

function sameDate(
    value,
    iso
) {

    return (
        toISO(value)
        ===
        iso
    );

}


/* =========================================================
   CHUYỂN NGÀY SANG ISO
========================================================= */

function toISO(
    value
) {

    if (!value)
        return "";


    if (
        value instanceof Date
        &&
        !isNaN(value)
    ) {

        return (

            value.getFullYear()
            +
            "-"
            +
            String(
                value.getMonth()+1
            ).padStart(2,"0")
            +
            "-"
            +
            String(
                value.getDate()
            ).padStart(2,"0")

        );

    }


    const text =
        String(value).trim();


    if (
        /^\d{4}-\d{2}-\d{2}/
            .test(text)
    ) {

        return text.slice(
            0,
            10
        );

    }


    const match =
        text.match(
            /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
        );


    if (match) {

        return (

            match[3]
            +
            "-"
            +
            String(
                match[2]
            ).padStart(2,"0")
            +
            "-"
            +
            String(
                match[1]
            ).padStart(2,"0")

        );

    }


    const date =
        new Date(text);


    if (
        isNaN(date)
    )
        return "";


    return (

        date.getFullYear()
        +
        "-"
        +
        String(
            date.getMonth()+1
        ).padStart(2,"0")
        +
        "-"
        +
        String(
            date.getDate()
        ).padStart(2,"0")

    );

}


/* =========================================================
   HIỂN THỊ NGÀY
========================================================= */

function formatDate(
    value
) {

    const iso =
        toISO(value);


    if (!iso)
        return value
            ?
            esc(value)
            :
            "—";


    const [

        year,
        month,
        day

    ] =
        iso.split("-");


    return (
        day
        +
        "/"
        +
        month
        +
        "/"
        +
        year
    );

}


/* =========================================================
   TÍNH ĐIỂM TRUNG BÌNH
========================================================= */

function average(
    values
) {

    const numbers =
        values

            .map(
                Number
            )

            .filter(
                Number.isFinite
            );


    if (
        !numbers.length
    )
        return null;


    return (

        numbers.reduce(
            (a,b) =>
                a + b,
            0
        )
        /
        numbers.length

    );

}


/* =========================================================
   HIỂN THỊ ĐIỂM
========================================================= */

function num(
    value
) {

    if (
        value === ""
        ||
        value == null
    )
        return "—";


    const number =
        Number(value);


    return Number.isFinite(
        number
    )

        ?

        number

        :

        esc(value);

}


/* =========================================================
   TRẠNG THÁI ĐIỂM DANH
========================================================= */

function status(
    value
) {

    const text =
        norm(value);


    if (
        text === "co mat"
        ||
        text === "present"
    )
        return "Có mặt";


    if (
        text === "di muon"
        ||
        text === "late"
    )
        return "Đi muộn";


    if (
        text === "vang"
        ||
        text === "absent"
    )
        return "Vắng";


    return "Chưa xác định";

}


/* =========================================================
   BADGE
========================================================= */

function badge(
    value
) {

    let className =
        "unknown";


    if (
        value === "Có mặt"
    )
        className =
            "present";


    else if (
        value === "Đi muộn"
    )
        className =
            "late";


    else if (
        value === "Vắng"
    )
        className =
            "absent";


    return `

        <span
            class="badge ${className}">

            ${esc(value)}

        </span>

    `;

}


/* =========================================================
   LẤY CHỮ CÁI ĐẦU
========================================================= */

function initials(
    value
) {

    return String(
        value || "HS"
    )

    .trim()

    .split(
        /\s+/
    )

    .slice(
        -2
    )

    .map(
        word =>
            word[0]
    )

    .join("")
    .toUpperCase();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(
    value
) {

    return String(
        value ?? ""
    )

    .replaceAll(
        "&",
        "&amp;"
    )

    .replaceAll(
        "<",
        "&lt;"
    )

    .replaceAll(
        ">",
        "&gt;"
    )

    .replaceAll(
        '"',
        "&quot;"
    )

    .replaceAll(
        "'",
        "&#039;"
    );

}


/* =========================================================
   SAFE
========================================================= */

function safe(
    value
) {

    return String(
        value ?? ""
    );

}


/* =========================================================
   EMPTY
========================================================= */

function empty(
    message
) {

    return `

        <div class="empty">

            ${esc(message)}

        </div>

    `;

}


/* =========================================================
   STATUS
========================================================= */

function showStatus(
    message,
    type = "info"
) {

    const element =
        $("status");


    element.textContent =
        message;


    element.className =
        `status show ${type}`;


    clearTimeout(
        window._statusTimer
    );


    window._statusTimer =
        setTimeout(
            () => {

                element.classList.remove(
                    "show"
                );

            },
            5000
        );

}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

    try {


        if (
            !navigator.mediaDevices
            ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Trình duyệt không hỗ trợ camera"
            );

        }


        stopCamera();


        state.cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode:"user"
                },

                audio:false

            });


        $("cameraVideo").srcObject =
            state.cameraStream;


        showStatus(
            "Camera đã bật.",
            "success"
        );


    }
    catch(error) {

        console.error(
            error
        );


        showStatus(

            "Không mở được camera. " +
            "Hãy cấp quyền camera cho trang GitHub Pages.",

            "error"

        );

    }

}


/* =========================================================
   DỪNG CAMERA
========================================================= */

function stopCamera() {


    if (
        state.cameraStream
    ) {

        state.cameraStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );


        state.cameraStream =
            null;

    }


    if (
        $("cameraVideo")
    ) {

        $("cameraVideo")
            .srcObject =
            null;

    }

}


/* =========================================================
   CHỤP ẢNH
========================================================= */

function capturePhoto() {


    const video =
        $("cameraVideo");


    const canvas =
        $("cameraCanvas");


    if (
        !video.srcObject
        ||
        video.readyState < 2
    ) {

        showStatus(
            "Hãy bật camera trước.",
            "error"
        );

        return;

    }


    canvas.width =
        video.videoWidth
        ||
        640;


    canvas.height =
        video.videoHeight
        ||
        480;


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(

        video,

        0,

        0,

        canvas.width,

        canvas.height

    );


    showStatus(
        "Đã chụp ảnh.",
        "success"
    );

}


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

console.log(
    "Quản lý lớp học – Dashboard đã khởi động."
);
