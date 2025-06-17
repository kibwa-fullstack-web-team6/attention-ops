# Attention
웹 기반 사용자 집중도 측정&amp;모니터링 프로젝트

## 커밋 메시지 구조

===================================
<type>: <subject>

<body>

<footer>

===================================

### Type(타입 종류)
해당 커밋의 종류를 나타내며, 아래 중 하나를 선택합니다.

feat : 새로운 기능 추가, 기존의 기능을 요구 사항에 맞추어 수정 커밋

fix : 기능에 대한 버그 수정 커밋

build : 빌드 관련 수정 / 모듈 설치 또는 삭제에 대한 커밋

chore : 패키지 매니저 수정, 그 외 기타 수정 ex) .gitignore

ci : CI 관련 설정 수정

docs : 문서(주석) 수정

style : 코드 스타일, 포맷팅에 대한 수정

refactor : 기능의 변화가 아닌 코드 리팩터링 ex) 변수 이름 변경

test : 테스트 코드 추가/

release : 버전 릴리즈

### Body (본문)
Header에서 표현할 수 없는 상세한 내용을 적습니다.

Header에서 충분히 표현할 수 있다면 생략 가능합니다.

 

### Footer
바닥글로 어떤 이슈에서 왔는지 같은 참조 정보들을 추가하는 용도로 사용합니다.
예) 특정 이슈를 참조 = Issues #1234 와 같이 작성하면 된다.

Footer도 필요 없을 생략 가능합니다.


## 파일 / 폴더 / 코드 제작 규칙

폴더명 : 모두 소문자 ex) artistelement

파일명 : 파스칼 케이스 ex) ProfileContent.js

클래스명 : 파스칼 케이스 ex) class ProfileContent

컴포넌트명 : 파스칼 케이스 ex)

함수 + 변수명 : 카멜 케이스 ex) fontSizeRules

함수는 동사 형으로 작성하기 ex) checkLoginStatus = () =>

변수는 명사 형으로 작성하기 ex) nameSet

주석 : import 모듈 바로 아래 class 및 function 시작 바로 위에 작성
