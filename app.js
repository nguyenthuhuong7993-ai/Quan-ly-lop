// ==================================================
// CẤU HÌNH API
// ==================================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbzXfW5EFKL3mKljkjEfFfhxPf2BrnaKJ_rNvUPSkQ8vA0XvnWwzu9buP4UsUiE81b2T/exec";


// ==================================================
// BIẾN DỮ LIỆU
// ==================================================

let classes = [];

let students = [];


// ==================================================
// KHI TRANG ĐƯỢC MỞ
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Ứng dụng bắt đầu..."
        );


        // Tìm kiếm học sinh
        const searchInput =
            document.getElementById(
                "searchInput"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                function () {

                    const classId =
                        document.getElementById(
                            "classSelect"
                        ).value;


                    displayStudents(
                        classId
                    );

                }
            );

        }


        // Tải dữ liệu
        loadData();

    }
);


// ==================================================
// TẢI DỮ LIỆU
// ==================================================

async function loadData() {

    try {

        showLoading(true);


        // ------------------------------------------
        // 1. LẤY DANH SÁCH LỚP
        // ------------------------------------------

        console.log(
            "Đang lấy danh sách lớp..."
        );


        const classResponse =
            await fetch(
                API_URL +
                "?action=getClasses"
            );


        const classResult =
            await classResponse.json();


        console.log(
            "Dữ liệu lớp:",
            classResult
        );


        if (!classResult.success) {

            throw new Error(
                classResult.error ||
                "Không lấy được danh sách lớp"
            );

        }


        classes =
            Array.isArray(
                classResult.data
            )
                ? classResult.data
                : [];


        console.log(
            "Số lớp:",
            classes.length
        );


        // Hiển thị số lớp
        document.getElementById(
            "classCount"
        ).textContent =
            classes.length;


        // Hiển thị danh sách lớp
        renderClasses();


        // ------------------------------------------
        // 2. LẤY DANH SÁCH HỌC SINH
        // ------------------------------------------

        console.log(
            "Đang lấy danh sách học sinh..."
        );


        const studentResponse =
            await fetch(
                API_URL +
                "?action=getStudents"
            );


        const studentResult =
            await studentResponse.json();


        console.log(
            "Dữ liệu học sinh:",
            studentResult
        );


        if (!studentResult.success) {

            throw new Error(
                studentResult.error ||
                "Không lấy được danh sách học sinh"
            );

        }


        students =
            Array.isArray(
                studentResult.data
            )
                ? studentResult.data
                : [];


        console.log(
            "Số học sinh:",
            students.length
        );


        // Hiển thị số học sinh
        document.getElementById(
            "studentCount"
        ).textContent =
            students.length;


        // ------------------------------------------
        // 3. TỰ ĐỘNG CHỌN LỚP ĐẦU TIÊN
        // ------------------------------------------

        const select =
            document.getElementById(
                "classSelect"
            );


        if (
            classes.length > 0 &&
            select
        ) {

            const firstClass =
                classes[0];


            const firstClassId =
                getValue(
                    firstClass,
                    [
                        "MaLop",
                        "MALOP",
                        "maLop",
                        "ma_lop"
                    ]
                );


            select.value =
                String(
                    firstClassId
                ).trim();


            console.log(
                "Tự động chọn lớp:",
                select.value
            );


            // Hiển thị học sinh
            displayStudents(
                select.value
            );

        }


        showLoading(false);


        console.log(
            "ĐÃ TẢI XONG TOÀN BỘ DỮ LIỆU"
        );

    }

    catch (error) {

        console.error(
            "LỖI TẢI DỮ LIỆU:",
            error
        );


        showLoading(false);


        showMessage(
            "Có lỗi khi tải dữ liệu."
        );

    }

}


// ==================================================
// HIỂN THỊ DANH SÁCH LỚP
// ==================================================

function renderClasses() {

    const select =
        document.getElementById(
            "classSelect"
        );


    if (!select) {

        return;

    }


    select.innerHTML = "";


    // Dòng mặc định
    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value = "";


    defaultOption.textContent =
        "-- Chọn lớp --";


    select.appendChild(
        defaultOption
    );


    // Thêm từng lớp
    classes.forEach(
        function (item) {

            const option =
                document.createElement(
                    "option"
                );


            const maLop =
                getValue(
                    item,
                    [
                        "MaLop",
                        "MALOP",
                        "maLop",
                        "ma_lop"
                    ]
                );


            const tenLop =
                getValue(
                    item,
                    [
                        "TenLop",
                        "TENLOP",
                        "tenLop",
                        "ten_lop"
                    ]
                );


            option.value =
                String(
                    maLop
                ).trim();


            option.textContent =
                tenLop ||
                maLop;


            select.appendChild(
                option
            );


            console.log(
                "Đã thêm lớp:",
                maLop,
                tenLop
            );

        }
    );

}


// ==================================================
// HIỂN THỊ HỌC SINH
// ==================================================

function displayStudents(classId) {

    console.log(
        "displayStudents() được gọi với:",
        classId
    );


    const container =
        document.getElementById(
            "studentList"
        );


    const selectedClass =
        document.getElementById(
            "selectedClass"
        );


    // Xóa danh sách cũ
    container.innerHTML = "";


    // ------------------------------------------
    // CHƯA CHỌN LỚP
    // ------------------------------------------

    if (
        !classId ||
        String(classId).trim() === ""
    ) {

        selectedClass.textContent =
            "Chưa chọn lớp";


        container.innerHTML =
            '<div class="loading">Vui lòng chọn lớp.</div>';


        return;

    }


    // Chuẩn hóa mã lớp
    const wantedClass =
        String(classId)
            .trim()
            .toLowerCase();


    console.log(
        "Đang tìm học sinh của:",
        wantedClass
    );


    // ------------------------------------------
    // TÌM TÊN LỚP
    // ------------------------------------------

    const currentClass =
        classes.find(
            function (item) {

                const maLop =
                    getValue(
                        item,
                        [
                            "MaLop",
                            "MALOP",
                            "maLop",
                            "ma_lop"
                        ]
                    );


                return String(
                    maLop
                )
                    .trim()
                    .toLowerCase()
                    === wantedClass;

            }
        );


    if (currentClass) {

        const tenLop =
            getValue(
                currentClass,
                [
                    "TenLop",
                    "TENLOP",
                    "tenLop",
                    "ten_lop"
                ]
            );


        selectedClass.textContent =
            tenLop ||
            classId;

    }

    else {

        selectedClass.textContent =
            classId;

    }


    // ------------------------------------------
    // TỪ KHÓA TÌM KIẾM
    // ------------------------------------------

    const keyword =
        document.getElementById(
            "searchInput"
        ).value
        .trim()
        .toLowerCase();


    // ------------------------------------------
    // LỌC HỌC SINH
    // ------------------------------------------

    const filtered =
        students.filter(
            function (student) {

                const maLop =
                    getValue(
                        student,
                        [
                            "MaLop",
                            "MALOP",
                            "maLop",
                            "ma_lop"
                        ]
                    );


                const hoTen =
                    getValue(
                        student,
                        [
                            "HoTen",
                            "HOTEN",
                            "hoTen",
                            "ho_ten"
                        ]
                    );


                const studentClass =
                    String(
                        maLop
                    )
                        .trim()
                        .toLowerCase();


                const studentName =
                    String(
                        hoTen || ""
                    )
                        .trim()
                        .toLowerCase();


                const dungLop =
                    studentClass ===
                    wantedClass;


                const dungTen =
                    studentName.includes(
                        keyword
                    );


                return (
                    dungLop &&
                    dungTen
                );

            }
        );


    console.log(
        "Học sinh tìm thấy:",
        filtered.length
    );


    // ------------------------------------------
    // KHÔNG CÓ HỌC SINH
    // ------------------------------------------

    if (
        filtered.length === 0
    ) {

        container.innerHTML =
            '<div class="loading">Không có học sinh trong lớp này.</div>';


        return;

    }


    // ------------------------------------------
    // HIỂN THỊ
    // ------------------------------------------

    filtered.forEach(
        function (student) {

            createStudentCard(
                student,
                container
            );

        }
    );

}


// ==================================================
// TẠO THẺ HỌC SINH
// ==================================================

function createStudentCard(
    student,
    container
) {

    const stt =
        getValue(
            student,
            [
                "STT",
                "stt"
            ]
        );


    const maHS =
        getValue(
            student,
            [
                "MaHS",
                "MAHS",
                "maHS",
                "ma_hs"
            ]
        );


    const hoTen =
        getValue(
            student,
            [
                "HoTen",
                "HOTEN",
                "hoTen",
                "ho_ten"
            ]
        );


    const ngaySinh =
        getValue(
            student,
            [
                "NgaySinh",
                "NGAYSINH",
                "ngaySinh",
                "ngay_sinh"
            ]
        );


    const gioiTinh =
        getValue(
            student,
            [
                "Gioitinh",
                "GIOITINH",
                "gioitinh",
                "gioiTinh"
            ]
        );


    // ------------------------------------------
    // THẺ
    // ------------------------------------------

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "student-card";


    // ------------------------------------------
    // STT
    // ------------------------------------------

    const number =
        document.createElement(
            "div"
        );


    number.className =
        "student-number";


    number.textContent =
        stt || "";


    // ------------------------------------------
    // THÔNG TIN
    // ------------------------------------------

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "student-info";


    // Tên
    const name =
        document.createElement(
            "div"
        );


    name.className =
        "student-name";


    name.textContent =
        hoTen ||
        "Chưa có tên";


    // Mã học sinh
    const code =
        document.createElement(
            "div"
        );


    code.className =
        "student-code";


    code.textContent =
        "Mã HS: " +
        (maHS || "");


    // Ngày sinh
    const birthday =
        document.createElement(
            "div"
        );


    birthday.className =
        "student-code";


    if (ngaySinh) {

        birthday.textContent =
            "Ngày sinh: " +
            ngaySinh;

    }


    // Giới tính
    const gender =
        document.createElement(
            "div"
        );


    gender.className =
        "student-code";


    if (gioiTinh) {

        gender.textContent =
            "Giới tính: " +
            gioiTinh;

    }


    // Ghép
    info.appendChild(
        name
    );


    info.appendChild(
        code
    );


    if (ngaySinh) {

        info.appendChild(
            birthday
        );

    }


    if (gioiTinh) {

        info.appendChild(
            gender
        );

    }


    card.appendChild(
        number
    );


    card.appendChild(
        info
    );


    container.appendChild(
        card
    );

}


// ==================================================
// LẤY GIÁ TRỊ
// ==================================================

function getValue(
    object,
    keys
) {

    if (!object) {

        return "";

    }


    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const key =
            keys[i];


        if (
            object[key] !== undefined &&
            object[key] !== null
        ) {

            return object[key];

        }

    }


    return "";

}


// ==================================================
// LOADING
// ==================================================

function showLoading(show) {

    const loading =
        document.getElementById(
            "loading"
        );


    if (!loading) {

        return;

    }


    loading.style.display =
        show
            ? "block"
            : "none";

}


// ==================================================
// THÔNG BÁO
// ==================================================

function showMessage(text) {

    const message =
        document.getElementById(
            "message"
        );


    if (!message) {

        return;

    }


    message.textContent =
        text;


    message.style.display =
        "block";


    setTimeout(
        function () {

            message.style.display =
                "none";

        },
        4000
    );

}
