/*
 The MIT License (MIT)

 Copyright (c) 2015 Chris Dickson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */
function testmain() {

	var text = 'Vice President Johnson, Mr. Speaker, Mr. Chief Justice, President Eisenhower, Vice President Nixon, Pres' +
        'ident Truman, reverend clergy, fellow citizens:      We observe today not a victory of party, but a celebration' +
        ' of freedom -- symbolizing an end, as well as a beginning -- signifying renewal, as well as change. For I have' +
        ' sworn before you and Almighty God the same solemn oath our forebears prescribed nearly a century and three-qu' +
        'arters ago.          The world is very different now. For man holds in his mortal hands the power to abolish al' +
        'l forms of human poverty and all forms of human life. And yet the same revolutionary beliefs for which our fore' +
        'bears fought are still at issue around the globe -- the belief that the rights of man come not from the generos' +
        'ity of the state, but from the hand of God.          We dare not forget today that we are the heirs of that fi' +
        'rst revolution. Let the word go forth from this time and place, to friend and foe alike, that the torch has be' +
        'en passed to a new generation of Americans -- born in this century, tempered by war, disciplined by a hard and' +
        ' bitter peace, proud of our ancient heritage, and unwilling to witness or permit the slow undoing of those hum' +
        'an rights to which this nation has always been committed, and to which we are committed today at home and arou' +
        'nd the world.          Let every nation know, whether it wishes us well or ill, that we shall pay any price, b' +
        'ear any burden, meet any hardship, support any friend, oppose any foe, to assure the survival and the success' +
        ' of liberty.          This much we pledge -- and more.          To those old allies whose cultural and spiritu' +
        'al origins we share, we pledge the loyalty of faithful friends. United there is little we cannot do in a host ' +
        'of cooperative ventures. Divided there is little we can do -- for we dare not meet a powerful challenge at odd' +
        's and split asunder.          To those new states whom we welcome to the ranks of the free, we pledge our word' +
        ' that one form of colonial control shall not have passed away merely to be replaced by a far more iron tyrann' +
        'y. We shall not always expect to find them supporting our view. But we shall always hope to find them strongl' +
        'y supporting their own freedom -- and to remember that, in the past, those who foolishly sought power by ridi' +
        'ng the back of the tiger ended up inside.          To those people in the huts and villages of half the globe' +
        ' struggling to break the bonds of mass misery, we pledge our best efforts to help them help themselves, for w' +
        'hatever period is required -- not because the Communists may be doing it, not because we seek their votes, bu' +
        't because it is right. If a free society cannot help the many who are poor, it cannot save the few who are ri' +
        'ch.          To our sister republics south of our border, we offer a special pledge: to convert our good word' +
        's into good deeds, in a new alliance for progress, to assist free men and free governments in casting off the' +
        ' chains of poverty. But this peaceful revolution of hope cannot become the prey of hostile powers. Let all our' +
        ' neighbors know that we shall join with them to oppose aggression or subversion anywhere in the Americas. And' +
        ' let every other power know that this hemisphere intends to remain the master of its own house.          To t' +
        'hat world assembly of sovereign states, the United Nations, our last best hope in an age where the instrument' +
        's of war have far outpaced the instruments of peace, we renew our pledge of support -- to prevent it from bec' +
        'oming merely a forum for invective, to strengthen its shield of the new and the weak, and to enlarge the area' +
        ' in which its writ may run.          Finally, to those nations who would make themselves our adversary, we of' +
        'fer not a pledge but a request: that both sides begin anew the quest for peace, before the dark powers of de' +
        'struction unleashed by science engulf all humanity in planned or accidental self-destruction.          We da' +
        're not tempt them with weakness. For only when our arms are sufficient beyond doubt can we be certain beyond' +
        ' doubt that they will never be employed.          But neither can two great and powerful groups of nations t' +
        'ake comfort from our present course -- both sides overburdened by the cost of modern weapons, both rightly a' +
        'larmed by the steady spread of the deadly atom, yet both racing to alter that uncertain balance of terror tha' +
        't stays the hand of mankind\'s final war.        So let us begin anew -- remembering on both sides that civili' +
        'ty is not a sign of weakness, and sincerity is always subject to proof. Let us never negotiate out of fear, bu' +
        't let us never fear to negotiate.          Let both sides explore what problems unite us instead of belaboring' +
        ' those problems which divide us.          Let both sides, for the first time, formulate serious and precise p' +
        'roposals for the inspection and control of arms, and bring the absolute power to destroy other nations under t' +
        'he absolute control of all nations.          Let both sides seek to invoke the wonders of science instead of ' +
        'its terrors. Together let us explore the stars, conquer the deserts, eradicate disease, tap the ocean depths,' +
        ' and encourage the arts and commerce.          Let both sides unite to heed, in all corners of the earth, the ' +
        'command of Isaiah -- to "undo the heavy burdens, and [to] let the oppressed go free."¹  And, if a beachhead of' +
        ' cooperation may push back the jungle of suspicion, let both sides join in creating a new endeavor -- not a ne' +
        'w balance of power, but a new world of law -- where the strong are just, and the weak secure, and the peace pr' +
        'eserved.          All this will not be finished in the first one hundred days. Nor will it be finished in the f' +
        'irst one thousand days; nor in the life of this Administration; nor even perhaps in our lifetime on this planet' +
        '. But let us begin.          In your hands, my fellow citizens, more than mine, will rest the final success or ' +
        'failure of our course. Since this country was founded, each generation of Americans has been summoned to give ' +
        'testimony to its national loyalty. The graves of young Americans who answered the call to service surround the' +
        ' globe.          Now the trumpet summons us again -- not as a call to bear arms, though arms we need -- not as' +
        ' a call to battle, though embattled we are -- but a call to bear the burden of a long twilight struggle, year ' +
        'in and year out, "rejoicing in hope; patient in tribulation,"² a struggle against the common enemies of man: ' +
        'tyranny, poverty, disease, and war itself.          Can we forge against these enemies a grand and global alli' +
        'ance, North and South, East and West, that can assure a more fruitful life for all mankind? Will you join in t' +
        'hat historic effort?            In the long history of the world, only a few generations have been granted the' +
        ' role of defending freedom in its hour of maximum danger. I do not shrink from this responsibility -- I welcom' +
        'e it. I do not believe that any of us would exchange places with any other people or any other generation. The ' +
        'energy, the faith, the devotion which we bring to this endeavor will light our country and all who serve it. An' +
        'd the glow from that fire can truly light the world.          And so, my fellow Americans, ask not what your co' +
        'untry can do for you; ask what you can do for your country.          My fellow citizens of the world, ask not ' +
        'what America will do for you, but what together we can do for the freedom of man.          Finally, whether yo' +
        'u are citizens of America or citizens of the world, ask of us here the same high standards of strength and sac' +
        'rifice which we ask of you. With a good conscience our only sure reward, with history the final judge of our d' +
        'eeds, let us go forth to lead the land we love, asking His blessing and His help, but knowing that here on ear' +
        'th God\'s work must truly be our own.'


	var canvas = document.getElementById('myCanvas');
    canvas.width *=3;
    canvas.height *= 3;


    var saveBtn = document.createElement('button');
    saveBtn.innerHTML = 'Save'
    saveBtn.onclick = function() {
        cloud.save('image/png','wordcloud.png');
    }
    document.body.appendChild(saveBtn);


	var cloud = new Cloud5()
		.canvas(canvas)
        .text(text)
        .generate();
}