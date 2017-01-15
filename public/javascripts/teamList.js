$(document).ready( function () {
    $('#table_id').DataTable({
        fixedColumns: true,
        "scrollX": true,
        ajax:"/api/RE-VRC-16-1323/skills",
        "columns": [
            { "data": "team" },
            { "data": "r" },
            { "data": "p" },
            { "data": null,
                "render":function(data,type,full,meta) {
                    return data.r + data.p;
                }
            }
        ]
        /*"aaSorting": [[ 1, "asc" ], [2, "asc"], [3, "asc"], [4, "asc"]]*/
    });
} );