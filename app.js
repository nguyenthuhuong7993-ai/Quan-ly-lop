// ==========================================
// CẤU HÌNH API
// ==========================================

const API_URL =
    "DÁN_WEB_APP_URL_CỦA_BẠN_VÀO_ĐÂY";


// ==========================================
// BIẾN DỮ LIỆU
// ==========================================

let classes = [];
let students = [];


// ==========================================
// KHI TRANG ĐƯỢC MỞ
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    loadClasses();

    document
        .getElementById("classSelect")
        .addEventListener("change", function () {

            const classId = this.value;

            displayStudents(classId);

        });


    document
        .getElementById("searchInput")
        .addEventListener("input", function () {

            const classId =
                document.getElementById("classSelect").value;

            displayStudents(classId);

        });

});


// ==========================================
// LẤY DANH SÁCH LỚP
// ==========================================

async function loadClasses() {

    try {

        showLoading(true);

        const response = await fetch(
            API_URL + "?action=getClasses"
        );

        const result = await response.json();

        if (!result.success) {

            throw new Error(result.error);

        }

        classes = result.data || [];

        renderClasses();

        document.getElementById("classCount")
            .textContent = classes.length;

        await loadStudents();

        showLoading(false);

    } catch (error) {

        console.error(error);

        showMessage(
            "Không thể tải danh sách lớp."
        );

        showLoading(false);
    }
}


// ==========================================
// LẤY DANH SÁCH HỌC SINH
// ==========================================

async function loadStudents() {

    try {

        const response = await fetch(
            API_URL + "?action=getStudents"
        );

        const result = await response.json();

        if (!result.success) {

            throw new Error(result.error);

        }

        students = result.data || [];

        document.getElementById("studentCount")
            .textContent = students.length;

    } catch (error) {

        console.error(error);

        showMessage(
            "Không thể tải danh sách học sinh."
        );

    }
}


// ==========================================
// HIỂN THỊ DANH SÁCH LỚP
// ==========================================

function renderClasses() {

    const select =
        document.getElementById("classSelect");

    select.innerHTML =
        '<option value="">-- Chọn lớp --</option>';

    classes.forEach(function (item) {

        const option =
            document.createElement("option");

        option.value = item.MaLop;

        option.textContent =
            item.TenLop;

        select.appendChild(option);

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


    container.innerHTML = "";


    if (!classId) {

        className.textContent =
            "Chưa chọn lớp";

        return;

    }


    const selectedClass =
        classes.find(function (item) {

            return item.MaLop === classId;

        });


    if (selectedClass) {

        className.textContent =
            selectedClass.TenLop;

    }


    const keyword =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();


    const filteredStudents =
        students.filter(function (student) {

            const sameClass =
                String(student.MaLop) ===
                String(classId);

            const name =
                String(student.HoTen || "")
                    .toLowerCase();

            return sameClass &&
                   name.includes(keyword);

        });


    if (filteredStudents.length === 0) {

        container.innerHTML =
            '<div class="loading">Không có học sinh.</div>';

        return;

    }


    filteredStudents.forEach(function (student) {

        const card =
            document.createElement("div");

        card.className =
            "student-card";


        card.innerHTML = `

            <div class="student-number">
                ${student.STT || ""}
            </div>

            <div class="student-info">

                <div class="student-name">
                    ${student.HoTen || ""}
                </div>

                <div class="student-code">
                    Mã HS: ${student.MaHS || ""}
                </div>

            </div>

        `;


        container.appendChild(card);

    });

}


// ==========================================
// LOADING
// ==========================================

function showLoading(show) {

    const loading =
        document.getElementById("loading");

    loading.style.display =
        show ? "block" : "none";

}


// ==========================================
// THÔNG BÁO
// ==========================================

function showMessage(text) {

    const message =
        document.getElementById("message");

    message.textContent = text;

    message.style.display = "block";


    setTimeout(function () {

        message.style.display = "none";

    }, 3000);

}
