// ==========================================
// CẤU HÌNH API GOOGLE APPS SCRIPT
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbzXfW5EFKL3mKljkjEfFfhxPf2BrnaKJ_rNvUPSkQ8vA0XvnWwzu9buP4UsUiE81b2T/exec";


// ==========================================
// BIẾN DỮ LIỆU
// ==========================================

let classes = [];
let students = [];


// ==========================================
// KHI TRANG ĐƯỢC MỞ
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("=== BẮT ĐẦU ỨNG DỤNG ===");

    const classSelect =
        document.getElementById("classSelect");

    const searchInput =
        document.getElementById("searchInput");


    // Khi chọn lớp
    classSelect.addEventListener("change", function () {

        console.log("Đã chọn lớp:", this.value);

        displayStudents(this.value);

    });


    // Khi tìm kiếm học sinh
    searchInput.addEventListener("input", function () {

        const classId =
            document.getElementById("classSelect").value;

        displayStudents(classId);

    });


    // Tải dữ liệu
    loadData();

});


// ==========================================
// TẢI TOÀN BỘ DỮ LIỆU
// ==========================================

async function loadData() {

    try {

        showLoading(true);

        console.log("Đang tải danh sách lớp...");

        await loadClasses();

        console.log("Đã tải lớp:", classes);

        console.log("Đang tải danh sách học sinh...");

        await loadStudents();

        console.log("Đã tải học sinh:", students);

        // Hiển thị tổng số
        document.getElementById("classCount").textContent =
            classes.length;

        document.getElementById("studentCount").textContent =
            students.length;


        // Sau khi tải xong dữ liệu,
        // nếu đang có lớp được chọn thì hiển thị học sinh
        const currentClass =
            document.getElementById("classSelect").value;

        if (currentClass) {

            displayStudents(currentClass);

        }


        showLoading(false);

        console.log("=== TẢI DỮ LIỆU THÀNH CÔNG ===");

    } catch (error) {

        console.error("LỖI:", error);

        showLoading(false);

        showMessage(
            "Không thể tải dữ liệu. Hãy kiểm tra Console."
        );

    }

}


// ==========================================
// LẤY DANH SÁCH LỚP
// ==========================================

async function loadClasses() {

    const url =
        API_URL + "?action=getClasses";

    console.log("API lớp:", url);

    const response =
        await fetch(url, {
            method: "GET",
            cache: "no-store"
        });


    if (!response.ok) {

        throw new Error(
            "API getClasses lỗi HTTP: " +
            response.status
        );

    }


    const result =
        await response.json();

    console.log("Kết quả getClasses:", result);


    if (!result.success) {

        throw new Error(
            result.error || "Không lấy được danh sách lớp"
        );

    }


    classes =
        Array.isArray(result.data)
            ? result.data
            : [];


    renderClasses();

}


// ==========================================
// LẤY DANH SÁCH HỌC SINH
// ==========================================

async function loadStudents() {

    const url =
        API_URL + "?action=getStudents";

    console.log("API học sinh:", url);

    const response =
        await fetch(url, {
            method: "GET",
            cache: "no-store"
        });


    if (!response.ok) {

        throw new Error(
            "API getStudents lỗi HTTP: " +
            response.status
        );

    }


    const result =
        await response.json();

    console.log("Kết quả getStudents:", result);


    if (!result.success) {

        throw new Error(
            result.error || "Không lấy được danh sách học sinh"
        );

    }


    students =
        Array.isArray(result.data)
            ? result.data
            : [];


    console.log(
        "Tổng số học sinh:",
        students.length
    );


    document.getElementById("studentCount")
        .textContent = students.length;

}


// ==========================================
// HIỂN THỊ DANH SÁCH LỚP
// ==========================================

function renderClasses() {

    const select =
        document.getElementById("classSelect");


    select.innerHTML = "";


    // Dòng mặc định
    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
        "-- Chọn lớp --";

    select.appendChild(defaultOption);


    // Thêm các lớp
    classes.forEach(function (item) {

        const option =
            document.createElement("option");


        const maLop =
            getValue(
                item,
                ["MaLop", "MALOP", "maLop", "ma_lop"]
            );


        const tenLop =
            getValue(
                item,
                ["TenLop", "TENLOP", "tenLop", "ten_lop"]
            );


        option.value =
            String(maLop).trim();


        option.textContent =
            tenLop || maLop;


        select.appendChild(option);


        console.log(
            "Lớp:",
            maLop,
            "-",
            tenLop
        );

    });

}


// ==========================================
// HIỂN THỊ HỌC SINH
// ==========================================

function displayStudents(classId) {

    const container =
        document.getElementById("studentList");

    const className =
        document.getElementById("selectedClass");


    // Xóa danh sách cũ
    container.innerHTML = "";


    // Nếu chưa chọn lớp
    if (!classId) {

        className.textContent =
            "Chưa chọn lớp";

        container.innerHTML =
            '<div class="loading">Vui lòng chọn lớp.</div>';

        return;

    }


    // Chuẩn hóa mã lớp
    const selectedClassId =
        String(classId)
            .trim()
            .toLowerCase();


    console.log(
        "Đang tìm học sinh của lớp:",
        selectedClassId
    );


    // Tìm tên lớp
    const selectedClass =
        classes.find(function (item) {

            const maLop =
                getValue(
                    item,
                    ["MaLop", "MALOP", "maLop", "ma_lop"]
                );

            return String(maLop)
                .trim()
                .toLowerCase()
                === selectedClassId;

        });


    // Hiển thị tên lớp
    if (selectedClass) {

        const tenLop =
            getValue(
                selectedClass,
                ["TenLop", "TENLOP", "tenLop", "ten_lop"]
            );

        className.textContent =
            tenLop || classId;

    } else {

        className.textContent =
            classId;

    }


    // Từ khóa tìm kiếm
    const keyword =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();


    // Lọc học sinh
    const filteredStudents =
        students.filter(function (student) {

            const maLop =
                getValue(
                    student,
                    ["MaLop", "MALOP", "maLop", "ma_lop"]
                );


            const hoTen =
                getValue(
                    student,
                    ["HoTen", "HOTEN", "hoTen", "ho_ten"]
                );


            const studentClassId =
                String(maLop)
                    .trim()
                    .toLowerCase();


            const studentName =
                String(hoTen || "")
                    .trim()
                    .toLowerCase();


            const sameClass =
                studentClassId === selectedClassId;


            const sameName =
                studentName.includes(keyword);


            return sameClass && sameName;

        });


    console.log(
        "Số học sinh tìm được:",
        filteredStudents.length
    );


    // Không có học sinh
    if (filteredStudents.length === 0) {

        container.innerHTML =
            '<div class="loading">Không có học sinh.</div>';

        return;

    }


    // Hiển thị từng học sinh
    filteredStudents.forEach(function (student) {

        createStudentCard(
            student,
            container
        );

    });

}


// ==========================================
// TẠO THẺ HỌC SINH
// ==========================================

function createStudentCard(student, container) {

    // Lấy dữ liệu
    const stt =
        getValue(
            student,
            ["STT", "stt"]
        );


    const hoTen =
        getValue(
            student,
            ["HoTen", "HOTEN", "hoTen", "ho_ten"]
        );


    const maHS =
        getValue(
            student,
            ["MaHS", "MAHS", "maHS", "ma_hs"]
        );


    // Tạo thẻ
    const card =
        document.createElement("div");


    card.className =
        "student-card";


    // Số thứ tự
    const number =
        document.createElement("div");


    number.className =
        "student-number";


    number.textContent =
        stt || "";


    // Khu vực thông tin
    const info =
        document.createElement("div");


    info.className =
        "student-info";


    // Tên học sinh
    const name =
        document.createElement("div");


    name.className =
        "student-name";


    name.textContent =
        hoTen || "Chưa có tên";


    // Mã học sinh
    const code =
        document.createElement("div");


    code.className =
        "student-code";


    code.textContent =
        "Mã HS: " + (maHS || "");


    // Ghép các phần
    info.appendChild(name);

    info.appendChild(code);

    card.appendChild(number);

    card.appendChild(info);

    container.appendChild(card);

}


// ==========================================
// LẤY GIÁ TRỊ AN TOÀN
// ==========================================

function getValue(object, keys) {

    if (!object) {

        return "";

    }


    for (let i = 0; i < keys.length; i++) {

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


// ==========================================
// HIỂN THỊ / ẨN LOADING
// ==========================================

function showLoading(show) {

    const loading =
        document.getElementById("loading");


    if (!loading) {

        return;

    }


    loading.style.display =
        show ? "block" : "none";

}


// ==========================================
// THÔNG BÁO
// ==========================================

function showMessage(text) {

    const message =
        document.getElementById("message");


    if (!message) {

        return;

    }


    message.textContent =
        text;


    message.style.display =
        "block";


    setTimeout(function () {

        message.style.display =
            "none";

    }, 4000);

}
