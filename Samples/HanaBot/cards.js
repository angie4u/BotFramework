// exports.card = {
//   'contentType': 'application/vnd.microsoft.card.adaptive',
//   'content': {
//     '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
//     'type': 'AdaptiveCard',
//     'version': '1.0',
//     'actions': [
//       {
//         'type': 'Action.ShowCard',
//         'title': '출발 일정 선택',
//         'card': {
//           'type': 'AdaptiveCard',
//           'body': [
//             {
//               'type': 'Input.Date',
//               'id': 'dueDate'
//             }
//           ],
//           'actions': [
//             {
//               'type': 'Action.Submit',
//               'title': 'OK'
//             }
//           ]
//         }
//       }
//     ]
//   }
// }
exports.card = {
  'contentType': 'application/vnd.microsoft.card.adaptive',
  'content': {
    '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
    'type': 'AdaptiveCard',
    'version': '1.0',
    'body': [
      {
        'type': 'TextBlock',
        'text': '출발 일정 선택'
      },
      {
        'type': 'Input.Date',
        'id': 'startDate'
      }

    ],
    'actions': [
      {
        'type': 'Action.Submit',
        'title': 'OK'
      }
    ]
  }
}
