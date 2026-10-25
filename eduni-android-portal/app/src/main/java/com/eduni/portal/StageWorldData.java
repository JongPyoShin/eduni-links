package com.eduni.portal;

/** Immutable authored-world data shared by Camp and Waterfall encounters. */
public final class StageWorldData {
    public final String id, birdId, birdDisplayName, birdIcon, discoveryCue, objective, landmark;
    public final String quizQuestion, quizAnswer, rewardTitle, rewardDescription, rewardBadge, collectionKey;
    public final String[] quizOptions;
    public final float birdX, birdY, landmarkX, landmarkY;

    private StageWorldData(String id, String birdId, String birdDisplayName, String birdIcon, String discoveryCue,
                           String objective, String landmark, String quizQuestion, String[] quizOptions, String quizAnswer,
                           String rewardTitle, String rewardDescription, String rewardBadge, String collectionKey,
                           float birdX, float birdY, float landmarkX, float landmarkY) {
        this.id = id; this.birdId = birdId; this.birdDisplayName = birdDisplayName; this.birdIcon = birdIcon;
        this.discoveryCue = discoveryCue; this.objective = objective; this.landmark = landmark;
        this.quizQuestion = quizQuestion; this.quizOptions = quizOptions; this.quizAnswer = quizAnswer;
        this.rewardTitle = rewardTitle; this.rewardDescription = rewardDescription; this.rewardBadge = rewardBadge; this.collectionKey = collectionKey;
        this.birdX = birdX; this.birdY = birdY; this.landmarkX = landmarkX; this.landmarkY = landmarkY;
    }

    private static final StageWorldData CAMP = new StageWorldData(
                "camp", "camp_bluebird", "파랑새", "🐦", "등불 길에서 파랑새의 노랫소리가 들려요.",
                "등불 길을 따라 파랑새를 찾아보자", "캠프 등불", "방금 본 파랑새의 색은 무엇일까?", new String[]{"파란색", "빨간색"}, "파란색",
                "파랑새를 만났어!", "잘 관찰해서 파랑새를 도감에 담았어.", "파랑새", "collection_camp_bluebird",
                .48f, .16f, .48f, .28f);

    private static final StageWorldData WATERFALL = new StageWorldData(
                "waterfall", "waterfall_kingfisher", "물총새", "🐦", "폭포 옆에서 물총새의 맑은 노랫소리가 들려요.",
                "폭포 물안개를 따라 물총새를 찾아보자", "폭포 물안개", "방금 본 물총새의 부리는 어떤 색일까?", new String[]{"주황색", "보라색"}, "주황색",
                "물총새를 만났어!", "폭포 곁의 물총새를 도감에 담았어.", "물총새", "collection_waterfall_kingfisher",
                .58f, .34f, .78f, .50f);

    private static final StageWorldData[] AUTHORED_WORLDS = { CAMP, WATERFALL };

    public static StageWorldData camp() { return CAMP; }
    public static StageWorldData waterfall() { return WATERFALL; }

    public static StageWorldData forStageIndex(int stageIndex) {
        return stageIndex >= 0 && stageIndex < AUTHORED_WORLDS.length ? AUTHORED_WORLDS[stageIndex] : null;
    }
}
