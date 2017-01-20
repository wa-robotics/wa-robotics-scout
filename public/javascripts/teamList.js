$(document).ready( function () {
    $('#table_id').DataTable({
        fixedColumns: true,
        "scrollX": true,
        paging:false,
        ajax:"/api/RE-VRC-17-5496/skills",
        "columns": [
            { "data": null,
                "render":function(data,type,full,meta) {
                    return '<button class="mdl-button mdl-js-button mdl-button--icon star-match-btn"><i id="' + data.team + '" class="material-icons">star_border</i></button>';
                }
            },
            { "data": "team" },
           // { "data": "r" },
            //{ "data": "p" },

        ]
        /*"aaSorting": [[ 1, "asc" ], [2, "asc"], [3, "asc"], [4, "asc"]]*/
    });
} );